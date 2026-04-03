import React, { useState, useEffect, useRef } from 'react';
import Timer from '../Timer';
import Board from '../Board';
import DraggableBrick from '../DraggableBrick';
import { Socket } from 'socket.io-client';
import { gridToBricks, shapeToBricks, createSeededRNG } from '../../../utils/gameUtils';

import '../../CSS/ReproductionGame.css'; 
import '../../CSS/GameOverTetris.css'
import backgroundImage from '../../../assets/background_8bit.jpg';

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
  const [opponentFinished, setOpponentFinished] = useState(false); // NOUVEAU

  const rows = initialLevelData?.rows || 8;
  const cols = initialLevelData?.cols || 8;

  // Sauvegarde des scores
  useEffect(() => {
    const isMulti = !!roomCode;
    const canShowResult = !isMulti || (gameOver && opponentFinished);

    if (gameOver && canShowResult && !scoreSubmitted.current) {
      scoreSubmitted.current = true;
      const mode = roomCode ? 'multi' : 'solo';
      let result = 'none';
      if (mode === 'multi') {
          if (score > opponentScore) result = 'win';
          else if (score < opponentScore) result = 'loss';
          else result = 'draw';
      } else {
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

    const handleOpponentFinished = (data: any) => {
      setOpponentScore(data.score); // Sécurise le score final
      setOpponentFinished(true);
    };

    socket.on('receive_tetris_state', handleReceiveState);
    socket.on('opponent_finished', handleOpponentFinished);

    return () => { 
      socket.off('receive_tetris_state', handleReceiveState); 
      socket.off('opponent_finished', handleOpponentFinished);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !roomCode || board.length === 0) return;
    socket.emit('send_tetris_state', { roomCode, board, availablePieces, score });
  }, [board, availablePieces, score, socket, roomCode]);

  // Prévenir l'adversaire que j'ai terminé
  useEffect(() => {
    if (gameOver && roomCode) {
      socket?.emit('player_finished', { roomCode, score });
    }
  }, [gameOver, roomCode, score, socket]);

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
          if (targetR < 0 || targetR >= rows || targetC < 0 || targetC >= cols) return false;
          if (checkBoard[targetR][targetC] !== null) return false;
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
        if (piece.shape[r][c] === 1) newBoard[startR + r][startC + c] = piece.color;
      }
    }

    const clearedColors: string[] = [];
    const cellsToClear: { r: number; c: number }[] = [];

    // Vérifier les lignes
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

    // Vérifier les colonnes
    for (let c = 0; c < cols; c++) {
      const firstColor = newBoard[0][c];
      if (firstColor) {
        let isFull = true;
        for (let r = 1; r < rows; r++) {
          if (newBoard[r][c] !== firstColor) { isFull = false; break; }
        }
        if (isFull) {
          for (let r = 0; r < rows; r++) cellsToClear.push({ r, c });
          clearedColors.push(firstColor);
        }
      }
    }

    cellsToClear.forEach(pos => { newBoard[pos.r][pos.c] = null; });

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
        if (isValidPlacement(board, r, c, piece.shape)) validPositions.push({ r, c });
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
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggingIndex(null);
    setDragOverPos(null);
  };

  const handleCellHover = (r: number, c: number) => { setDragOverPos({ r, c }); };

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

  if (availablePieces.every(p => p === null) && queue.length === 0) return <h2 style={{color: "var(--neon-cyan)", textAlign: 'center'}}>chargement...</h2>;

  const isValidHover = dragOverPos && draggedPiece && isValidPlacement(board, adjustedR, adjustedC, draggedPiece.shape);
  const previewBricksForBoard = isValidHover ? shapeToBricks(draggedPiece.shape, draggedPiece.color) : null;

  return (
    <div 
      className="repro-page-wrapper" 
      style={{ 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="repro-layout-container">
        
        {/* ⬅️ COLONNE DE GAUCHE : Score et Pioche */}
        <div className="repro-side-panel">
          
          <div className="arcade-panel panel-cyan">
            <div className="arcade-panel-header">SCORE ACTUEL</div>
            <div className="arcade-panel-content">
              <div style={{ fontSize: '2.5rem', color: 'var(--neon-cyan)', textShadow: '0 0 15px var(--neon-cyan)', fontFamily: 'var(--font-heading)' }}>
                {score}
              </div>
            </div>
          </div>

          {!gameOver && (
            <div className="arcade-panel panel-magenta">
              <div className="arcade-panel-header">BRIQUE DISPONIBLE</div>
              <div className="arcade-panel-content">
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                  {availablePieces.map((piece, idx) => (
                    <div key={idx} style={{ padding: '15px', background: '#1a1a2a', border: '1px solid #2d2d44', borderRadius: '10px', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
                      <DraggableBrick 
                        disabled={!piece}
                        rows={piece ? piece.shape.length : 1}
                        cols={piece ? piece.shape[0].length : 1}
                        bricks={piece ? shapeToBricks(piece.shape, piece.color) : []}
                        cellSize={40} // Agrandie pour correspondre à Reproduction
                        isDragging={isDragging && draggingIndex === idx}
                        onDragStart={(e: React.DragEvent) => handleDragStart(e, idx)}
                        onDragEnd={handleDragEnd}
                        onClick={(e: React.MouseEvent) => handleRotate(idx, e)}
                        onMouseDown={() => setDragOffset({ r: 0, c: 0 })}
                      />
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '20px', textAlign: 'center', textTransform: 'uppercase' }}>
                  clic: pivoter | glisser: placer
                </p>
              </div>
            </div>
          )}

        </div>

        {/* ⬇️ COLONNE CENTRALE : Grille du joueur */}
        <div className="repro-center-panel">
          <div className="arcade-panel panel-cyan" style={{ width: '100%' }}>
            <div className="arcade-panel-header">CASSE-BRIQUES (BLAST) - GRILLE {rows}x{cols}</div>
            <div className="arcade-panel-content">
              
              {!gameOver ? (
                <Board 
                  rows={rows}
                  cols={cols}
                  bricks={gridToBricks(board)}
                  onCellDrop={handleCellDrop}
                  onCellHover={handleCellHover}
                  onMouseLeave={() => setDragOverPos(null)}
                  previewBricks={previewBricksForBoard}
                  hoverPos={dragOverPos ? { r: adjustedR, c: adjustedC } : null}
                  cellSize={45} // Agrandie !
                />
              ) : (
                <div className="tetris-gameover">
                  {(!roomCode || opponentFinished) ? (
                    <>
                      <h2 className="tetris-gameover-title">partie terminée !</h2>
                      <p className="tetris-gameover-text">plus aucun bloc ne peut être placé.</p>
                      <p className="tetris-gameover-text">votre score final est de : <strong>{score}</strong> points</p>
                      
                      {roomCode && (
                        <div className="multiplayer-result" style={{ marginTop: '20px' }}>
                          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: score > opponentScore ? 'var(--neon-green)' : (score < opponentScore ? 'var(--neon-magenta)' : 'var(--neon-yellow)') }}>
                            {score > opponentScore ? "🏆 VOUS AVEZ GAGNÉ ! 🏆" : (score < opponentScore ? "❌ VOUS AVEZ PERDU... ❌" : "🤝 C'EST UNE ÉGALITÉ ! 🤝")}
                          </p>
                        </div>
                      )}

                      <button 
                        className="btn-lego btn-blue tetris-gameover-btn" 
                        onClick={() => {
                          if (roomCode) socket?.emit('return_to_lobby', roomCode);
                          else window.location.reload();
                        }}
                      >
                        retour au salon
                      </button>
                    </>
                  ) : (
                    <>
                      <h2 className="tetris-gameover-title" style={{color: 'var(--neon-yellow)'}}>ATTENTE DE L'ADVERSAIRE ⏳</h2>
                      <p className="tetris-gameover-text">vous avez terminé avec <strong>{score}</strong> points.</p>
                      <p className="tetris-gameover-text" style={{fontSize: '0.9rem', color: '#888'}}>l'adversaire joue encore...</p>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ➡️ COLONNE DE DROITE : Chrono, Légende et Adversaire */}
        <div className="repro-side-panel">
          
          {!gameOver && (
            <div className="arcade-panel panel-yellow">
              <div className="arcade-panel-header">TEMPS RESTANT</div>
              <div className="arcade-panel-content">
                <Timer timeLimit={15} onTimeout={handleTimeout} resetKey={turnIndex} />
              </div>
            </div>
          )}

          {!gameOver && (
            <div className="arcade-panel panel-magenta">
              <div className="arcade-panel-header">BARÈME (POINTS)</div>
              <div className="arcade-panel-content" style={{ alignItems: 'flex-start', width: '100%', padding: '20px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%', fontSize: '0.8rem', color: '#fff' }}>
                  {Object.entries(colorConfig).map(([color, config]) => (
                    <li key={color} style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ display: 'inline-block', width: '16px', height: '16px', backgroundColor: color, marginRight: '15px', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '2px' }}></span>
                      <span>{config.name} : <span style={{ color: 'var(--neon-yellow)' }}>{config.points}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {socket && roomCode && (
            <div className="arcade-panel panel-cyan">
              <div className="arcade-panel-header">ADVERSAIRE ⚔️</div>
              <div className="arcade-panel-content">
                <div style={{ color: 'var(--neon-magenta)', marginBottom: '15px', fontFamily: 'var(--font-heading)', fontSize: '0.9rem', textShadow: '0 0 5px var(--neon-magenta)' }}>
                  SCORE : {opponentScore}
                </div>
                <Board 
                  rows={rows}
                  cols={cols}
                  bricks={gridToBricks(opponentBoard || Array.from({ length: rows }, () => Array(cols).fill(null)))}
                  cellSize={18}
                  gridClassName="reproduction-opponent-grid-style"
                />
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default TetrisGame;