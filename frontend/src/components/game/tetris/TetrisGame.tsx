import React, { useState, useEffect, useRef } from 'react';
import Timer from '../Timer';
import Board from '../Board';
import DraggableBrick from '../DraggableBrick';
import { Socket } from 'socket.io-client';
import { gridToBricks, shapeToBricks, createSeededRNG } from '../../../utils/gameUtils';
import '../../CSS/GameTetris.css'; 

interface Piece {
  shape: number[][];
  color: string;
}

interface TetrisProps {
  initialLevelData?: {
    queue?: Piece[];
    rows: number;
    cols: number;
  };
  socket?: Socket;
  roomCode?: string;
}

const colorConfig: Record<string, { weight: number; points: number; name: string }> = {
  '#D92328': { weight: 50, points: 100, name: 'rouge (commun)' },
  '#006CB7': { weight: 30, points: 250, name: 'bleu (peu commun)' },
  '#FFCF00': { weight: 15, points: 500, name: 'jaune (rare)' },
  '#237841': { weight: 5, points: 1000, name: 'vert (légendaire)' }
};

const SHAPES = [
  [[1, 1, 1, 1]], 
  [[1, 1], [1, 1]], 
  [[0, 1, 0], [1, 1, 1]], 
  [[1, 0, 0], [1, 1, 1]], 
  [[0, 0, 1], [1, 1, 1]], 
  [[0, 1, 1], [1, 1, 0]], 
  [[1, 1, 0], [0, 1, 1]]  
];

const getRotatedShape = (shape: number[][]) => {
  return shape[0].map((_, index) => shape.map(row => row[index]).reverse());
};

const getRandomColor = (rng: () => number = Math.random) => {
  const totalWeight = Object.values(colorConfig).reduce((sum, config) => sum + config.weight, 0);
  let random = rng() * totalWeight;
  for (const [color, config] of Object.entries(colorConfig)) {
    if (random < config.weight) return color;
    random -= config.weight;
  }
  return '#D92328';
};

const TetrisGame = ({ initialLevelData, socket, roomCode }: TetrisProps) => {
  const [board, setBoard] = useState<(string | null)[][]>([]);
  const [queue, setQueue] = useState<Piece[]>([]);
  const [availablePieces, setAvailablePieces] = useState<(Piece | null)[]>([null]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [turnIndex, setTurnIndex] = useState(0);
  
  const scoreSubmitted = useRef(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverPos, setDragOverPos] = useState<{ r: number; c: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ r: number; c: number }>({ r: 0, c: 0 });

  const [opponentBoard, setOpponentBoard] = useState<(string | null)[][] | null>(null);
  const [opponentScore, setOpponentScore] = useState(0);

  const rows = initialLevelData?.rows || 8;
  const cols = initialLevelData?.cols || 8;

  // send score and stats on game over
  useEffect(() => {
    if (gameOver && !scoreSubmitted.current) {
      scoreSubmitted.current = true;

      // determine mode and final result for stats
      const mode = roomCode ? 'multi' : 'solo';
      let result = 'none';
      if (mode === 'multi') {
          if (score > opponentScore) result = 'win';
          else if (score < opponentScore) result = 'loss';
          else result = 'draw';
      } else {
          // in solo, consider the game validated and won if score > 0
          result = score > 0 ? 'win' : 'loss';
      }

      let loyaltyId = localStorage.getItem('loyalty_id');
      if (!loyaltyId) {
        loyaltyId = 'visitor_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('loyalty_id', loyaltyId);
      }

      fetch(`http://localhost:3000/api/player/${loyaltyId}/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            gameId: 'tetris', 
            score: score,
            mode: mode,
            result: result
        })
      }).catch(err => console.error("erreur d'envoi du score:", err));
    }
  }, [gameOver, score, opponentScore, roomCode]);

  useEffect(() => {
    const rng = roomCode ? createSeededRNG(roomCode) : Math.random;

    const randomQueue = Array.from({ length: 2000 }, () => ({
      shape: SHAPES[Math.floor(rng() * SHAPES.length)],
      color: getRandomColor(rng)
    }));

    const emptyBoard = Array.from({ length: rows }, () => Array(cols).fill(null));
    setBoard(emptyBoard);
    
    const finalQueue = (initialLevelData && initialLevelData.queue) ? initialLevelData.queue : randomQueue;
    const initialPieces = finalQueue.splice(0, 1);
    
    setAvailablePieces(initialPieces);
    setQueue(finalQueue);
  }, [initialLevelData, rows, cols, roomCode]);

  useEffect(() => {
    if (!socket) return;
    const handleReceiveState = (data: any) => {
      setOpponentBoard(data.board);
      setOpponentScore(data.score);
    };
    socket.on('receive_tetris_state', handleReceiveState);
    return () => {
      socket.off('receive_tetris_state', handleReceiveState);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !roomCode || board.length === 0) return;
    socket.emit('send_tetris_state', { roomCode, board, availablePieces, score });
  }, [board, availablePieces, score, socket, roomCode]);

  const handleRotate = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const piece = availablePieces[index];
    if (!piece || isDragging) return;
    
    const newShape = getRotatedShape(piece.shape);
    const newAvailablePieces = [...availablePieces];
    newAvailablePieces[index] = { ...piece, shape: newShape };
    setAvailablePieces(newAvailablePieces);
  };

  const isValidPlacement = (checkBoard: (string | null)[][], startR: number, startC: number, shape: number[][]) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          const targetR = startR + r;
          const targetC = startC + c;
          
          if (targetR < 0 || targetR >= rows || targetC < 0 || targetC >= cols) {
            return false;
          }
          
          if (checkBoard[targetR][targetC] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const canPlaceAnywhere = (checkBoard: (string | null)[][], piece: Piece) => {
    let currentShape = piece.shape;
    for (let rot = 0; rot < 4; rot++) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (isValidPlacement(checkBoard, r, c, currentShape)) return true;
        }
      }
      currentShape = getRotatedShape(currentShape);
    }
    return false;
  };

  const placePiece = (startR: number, startC: number, pieceIndex: number) => {
    const piece = availablePieces[pieceIndex];
    if (!piece) return;

    const newBoard = board.map(row => [...row]);
    
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] === 1) {
          newBoard[startR + r][startC + c] = piece.color;
        }
      }
    }

    const clearedColors: string[] = [];
    const cellsToClear: { r: number; c: number }[] = [];

    for (let r = 0; r < rows; r++) {
      const firstColor = newBoard[r][0];
      if (firstColor) {
        const isFull = newBoard[r].every(cell => cell === firstColor);
        if (isFull) {
          for (let c = 0; c < cols; c++) cellsToClear.push({ r, c });
          clearedColors.push(firstColor);
        }
      }
    }

    for (let c = 0; c < cols; c++) {
      const firstColor = newBoard[0][c];
      if (firstColor) {
        let isFull = true;
        for (let r = 1; r < rows; r++) {
          if (newBoard[r][c] !== firstColor) {
            isFull = false;
            break;
          }
        }
        if (isFull) {
          for (let r = 0; r < rows; r++) cellsToClear.push({ r, c });
          clearedColors.push(firstColor);
        }
      }
    }

    cellsToClear.forEach(pos => {
      newBoard[pos.r][pos.c] = null;
    });

    if (clearedColors.length > 0) {
      let basePointsForTurn = 0;
      clearedColors.forEach(color => {
        basePointsForTurn += colorConfig[color]?.points || 100;
      });
      setScore(prev => prev + (basePointsForTurn * clearedColors.length));
    }

    const newAvailable = [...availablePieces];
    newAvailable[pieceIndex] = null;

    let nextAvailable = newAvailable;
    let currentQueue = [...queue];
    let isOver = false;

    if (newAvailable.every(p => p === null)) {
      if (currentQueue.length < 1) {
        const fallbackRng = roomCode ? createSeededRNG(roomCode + "fallback") : Math.random;
        const morePieces = Array.from({ length: 100 }, () => ({
          shape: SHAPES[Math.floor(fallbackRng() * SHAPES.length)],
          color: getRandomColor(fallbackRng)
        }));
        currentQueue = [...currentQueue, ...morePieces];
      }
      nextAvailable = currentQueue.splice(0, 1);
      setQueue(currentQueue);
    }

    if (nextAvailable.every(p => p === null || !canPlaceAnywhere(newBoard, p))) {
      isOver = true;
    }

    setBoard(newBoard);
    setAvailablePieces(nextAvailable);
    if (isOver) setGameOver(true);
    setTurnIndex(prev => prev + 1);
  };

  const handleTimeout = () => {
    if (gameOver) return;
    const pieceIndex = availablePieces.findIndex(p => p !== null);
    if (pieceIndex === -1) return;
    const piece = availablePieces[pieceIndex]!;
    
    const validPositions = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (isValidPlacement(board, r, c, piece.shape)) {
          validPositions.push({ r, c });
        }
      }
    }

    if (validPositions.length > 0) {
      const timeoutRng = roomCode ? createSeededRNG(roomCode + turnIndex) : Math.random;
      const pos = validPositions[Math.floor(timeoutRng() * validPositions.length)];
      placePiece(pos.r, pos.c, pieceIndex);
    } else {
      setGameOver(true);
    }
  };

  const draggedPiece = draggingIndex !== null ? availablePieces[draggingIndex] : null;
  const adjustedR = dragOverPos ? dragOverPos.r - dragOffset.r : 0;
  const adjustedC = dragOverPos ? dragOverPos.c - dragOffset.c : 0;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (gameOver) e.preventDefault();
    setIsDragging(true);
    setDraggingIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggingIndex(null);
    setDragOverPos(null);
  };

  const handleCellHover = (r: number, c: number) => {
    setDragOverPos({ r, c });
  };

  const handleCellDrop = (r: number, c: number) => {
    setIsDragging(false);
    setDragOverPos(null);
    
    if (draggingIndex === null || !draggedPiece) return;
    
    const dropR = r - dragOffset.r;
    const dropC = c - dragOffset.c;
    
    if (isValidPlacement(board, dropR, dropC, draggedPiece.shape)) {
      placePiece(dropR, dropC, draggingIndex);
    }
    setDraggingIndex(null);
  };

  if (availablePieces.every(p => p === null) && queue.length === 0) return <h2>chargement...</h2>;

  const isValidHover = dragOverPos && draggedPiece && isValidPlacement(board, adjustedR, adjustedC, draggedPiece.shape);
  const previewBricksForBoard = isValidHover ? shapeToBricks(draggedPiece.shape, draggedPiece.color) : null;

  return (
    <div className="tetris-container">
      <h2 className="tetris-title">casse-briques (blast)</h2>
      
      <div className="tetris-layout">
        
        <div className="tetris-main">
          <div className="tetris-score">
            score : {score}
          </div>

          {!gameOver ? (
            <>
              <Timer timeLimit={15} onTimeout={handleTimeout} resetKey={turnIndex} />
              
              <div className="tetris-pool-container">
                <h4 className="tetris-pool-title">brique disponible :</h4>
                <div className="tetris-pool-flex">
                  {availablePieces.map((piece, idx) => (
                    <div key={idx} className="tetris-pool-item">
                      <DraggableBrick 
                        disabled={!piece}
                        rows={piece ? piece.shape.length : 1}
                        cols={piece ? piece.shape[0].length : 1}
                        bricks={piece ? shapeToBricks(piece.shape, piece.color) : []}
                        cellSize={25}
                        isDragging={isDragging && draggingIndex === idx}
                        onDragStart={(e: React.DragEvent) => handleDragStart(e, idx)}
                        onDragEnd={handleDragEnd}
                        onClick={(e: React.MouseEvent) => handleRotate(idx, e)}
                        onMouseDown={() => setDragOffset({ r: 0, c: 0 })}
                      />
                    </div>
                  ))}
                </div>
                <p className="tetris-pool-hint">
                  cliquez pour pivoter, glissez pour placer
                </p>
              </div>

              <Board 
                rows={rows}
                cols={cols}
                bricks={gridToBricks(board)}
                onCellDrop={handleCellDrop}
                onCellHover={handleCellHover}
                onMouseLeave={() => setDragOverPos(null)}
                previewBricks={previewBricksForBoard}
                hoverPos={dragOverPos ? { r: adjustedR, c: adjustedC } : null}
                cellSize={35}
                gridClassName="tetris-grid-style"
              />

              <div className="tetris-legend">
                <h4 className="tetris-legend-title">barème des points (par ligne) :</h4>
                <ul className="tetris-legend-list">
                  {Object.entries(colorConfig).map(([color, config]) => (
                    <li key={color} className="tetris-legend-item">
                      <span className="tetris-legend-color" style={{ backgroundColor: color }}></span>
                      <strong>{config.name}</strong> : {config.points} pts
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="tetris-gameover">
              <h2 className="tetris-gameover-title">partie terminée !</h2>
              <p className="tetris-gameover-text">plus aucun bloc ne peut être placé.</p>
              <p className="tetris-gameover-text">votre score final est de : <strong>{score}</strong> points</p>
              
              {roomCode && (
                  <p className="tetris-gameover-text" style={{ marginTop: '15px' }}>
                      {score > opponentScore ? "🏆 vous avez gagné ! 🏆" : (score < opponentScore ? "❌ vous avez perdu... ❌" : "🤝 c'est une égalité ! 🤝")}
                  </p>
              )}

              <button 
                className="btn-lego btn-blue tetris-gameover-btn" 
                onClick={() => window.location.reload()}
              >
                quitter
              </button>
            </div>
          )}
        </div>

        {socket && roomCode && (
          <div className="tetris-opponent">
            <h3 className="tetris-opponent-title">adversaire ⚔️</h3>
            <div className="tetris-opponent-score">
              score : {opponentScore}
            </div>

            <div className="tetris-opponent-label">grille :</div>
            <Board 
              rows={rows}
              cols={cols}
              bricks={gridToBricks(opponentBoard || Array.from({ length: rows }, () => Array(cols).fill(null)))}
              cellSize={15}
              gridClassName="tetris-opponent-grid-style"
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default TetrisGame;