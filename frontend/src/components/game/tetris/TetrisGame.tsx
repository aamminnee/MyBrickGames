import React, { useState, useEffect } from 'react';
import Timer from '../Timer';
import Board from '../Board';
import DraggableBrick from '../DraggableBrick';
import { Socket } from 'socket.io-client';
import { gridToBricks, shapeToBricks } from '../../../utils/gameUtils';
import '../../CSS/GameTetris.css'; // importation du css

// interface de forme
interface Piece {
  shape: number[][];
  color: string;
}

// interface des propriétés
interface TetrisProps {
  initialLevelData?: {
    queue?: Piece[];
    rows: number;
    cols: number;
  };
  socket?: Socket;
  roomCode?: string;
}

// configuration des points et poids des couleurs
const colorConfig: Record<string, { weight: number; points: number; name: string }> = {
  '#D92328': { weight: 50, points: 100, name: 'rouge (commun)' },
  '#006CB7': { weight: 30, points: 250, name: 'bleu (peu commun)' },
  '#FFCF00': { weight: 15, points: 500, name: 'jaune (rare)' },
  '#237841': { weight: 5, points: 1000, name: 'vert (légendaire)' }
};

// tableaux des formes de blocs
const SHAPES = [
  [[1, 1, 1, 1]], 
  [[1, 1], [1, 1]], 
  [[0, 1, 0], [1, 1, 1]], 
  [[1, 0, 0], [1, 1, 1]], 
  [[0, 0, 1], [1, 1, 1]], 
  [[0, 1, 1], [1, 1, 0]], 
  [[1, 1, 0], [0, 1, 1]]  
];

// pivoter la matrice 2d de 90 degrés
const getRotatedShape = (shape: number[][]) => {
  return shape[0].map((_, index) => shape.map(row => row[index]).reverse());
};

// choisir une couleur aléatoire basée sur le poids
const getRandomColor = () => {
  const totalWeight = Object.values(colorConfig).reduce((sum, config) => sum + config.weight, 0);
  let random = Math.random() * totalWeight;
  for (const [color, config] of Object.entries(colorConfig)) {
    if (random < config.weight) return color;
    random -= config.weight;
  }
  return '#D92328';
};

const TetrisGame = ({ initialLevelData, socket, roomCode }: TetrisProps) => {
  const [board, setBoard] = useState<(string | null)[][]>([]);
  const [queue, setQueue] = useState<Piece[]>([]);
  // on n'affiche plus qu'une seule pièce à la fois
  const [availablePieces, setAvailablePieces] = useState<(Piece | null)[]>([null]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [turnIndex, setTurnIndex] = useState(0);
  
  const [isDragging, setIsDragging] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverPos, setDragOverPos] = useState<{ r: number; c: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ r: number; c: number }>({ r: 0, c: 0 });

  const [opponentBoard, setOpponentBoard] = useState<(string | null)[][] | null>(null);
  const [opponentScore, setOpponentScore] = useState(0);

  const rows = initialLevelData?.rows || 8;
  const cols = initialLevelData?.cols || 8;

  // initialiser les pièces
  useEffect(() => {
    const randomQueue = Array.from({ length: 100 }, () => ({
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      color: getRandomColor()
    }));

    const emptyBoard = Array.from({ length: rows }, () => Array(cols).fill(null));
    setBoard(emptyBoard);
    
    const finalQueue = (initialLevelData && initialLevelData.queue) ? initialLevelData.queue : randomQueue;
    // on ne pioche qu'une seule pièce au lieu de 3
    const initialPieces = finalQueue.splice(0, 1);
    setAvailablePieces(initialPieces);
    setQueue(finalQueue);
  }, [initialLevelData, rows, cols]);

  // gérer les données du socket
  useEffect(() => {
    if (!socket) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleReceiveState = (data: any) => {
      setOpponentBoard(data.board);
      setOpponentScore(data.score);
    };
    socket.on('receive_tetris_state', handleReceiveState);
    return () => {
      socket.off('receive_tetris_state', handleReceiveState);
    };
  }, [socket]);

  // émettre les changements d'état
  useEffect(() => {
    if (!socket || !roomCode || board.length === 0) return;
    socket.emit('send_tetris_state', { roomCode, board, availablePieces, score });
  }, [board, availablePieces, score, socket, roomCode]);

  // rotation de la pièce
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

  // vérifier les placements valides (détection de collision directe sur la grille)
  const isValidPlacement = (checkBoard: (string | null)[][], startR: number, startC: number, shape: number[][]) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          const targetR = startR + r;
          const targetC = startC + c;
          
          // vérifie si la brique dépasse de la grille
          if (targetR < 0 || targetR >= rows || targetC < 0 || targetC >= cols) {
            return false;
          }
          
          // vérifie s'il y a déjà une brique à cet emplacement (collision)
          if (checkBoard[targetR][targetC] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // vérifier si la partie est terminée
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

  // logique pour placer une pièce
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

    // nettoyage des lignes
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

    // nettoyage des colonnes
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

    // recharger une pièce si toutes sont placées
    if (newAvailable.every(p => p === null)) {
      if (currentQueue.length < 1) {
        const morePieces = Array.from({ length: 50 }, () => ({
          shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
          color: getRandomColor()
        }));
        currentQueue = [...currentQueue, ...morePieces];
      }
      // on ne pioche qu'une seule pièce
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

  // gestionnaire de fin de minuterie
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
      const pos = validPositions[Math.floor(Math.random() * validPositions.length)];
      placePiece(pos.r, pos.c, pieceIndex);
    } else {
      setGameOver(true);
    }
  };

  const draggedPiece = draggingIndex !== null ? availablePieces[draggingIndex] : null;
  const adjustedR = dragOverPos ? dragOverPos.r - dragOffset.r : 0;
  const adjustedC = dragOverPos ? dragOverPos.c - dragOffset.c : 0;

  // commencer à glisser
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (gameOver) e.preventDefault();
    setIsDragging(true);
    setDraggingIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  // fin du glissement
  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggingIndex(null);
    setDragOverPos(null);
  };

  // gestion du survol
  const handleCellHover = (r: number, c: number) => {
    setDragOverPos({ r, c });
  };

  // gestion du dépôt
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
              <button 
                className="btn-lego btn-blue tetris-gameover-btn" 
                onClick={() => window.location.reload()}
              >
                rejouer
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