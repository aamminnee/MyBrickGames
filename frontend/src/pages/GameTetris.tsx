import React, { useState, useEffect } from 'react';
import Timer from '../components/game/Timer';
import { Socket } from 'socket.io-client';

// interface pour decrire une piece tetris
interface Piece {
  shape: number[][];
  color: string;
}

// interface pour les proprietes des donnees de niveau
interface TetrisProps {
  initialLevelData?: {
    queue?: Piece[];
    rows: number;
    cols: number;
  };
  socket?: Socket;
  roomCode?: string;
}

// definition des couleurs avec leur poids d'apparition et leur valeur en points
const colorConfig: Record<string, { weight: number; points: number; name: string }> = {
  '#D92328': { weight: 50, points: 100, name: 'rouge (commun)' },
  '#006CB7': { weight: 30, points: 250, name: 'bleu (peu commun)' },
  '#FFCF00': { weight: 15, points: 500, name: 'jaune (rare)' },
  '#237841': { weight: 5, points: 1000, name: 'vert (légendaire)' }
};

// les formes possibles
const SHAPES = [
  [[1, 1, 1, 1]], 
  [[1, 1], [1, 1]], 
  [[0, 1, 0], [1, 1, 1]], 
  [[1, 0, 0], [1, 1, 1]], 
  [[0, 0, 1], [1, 1, 1]], 
  [[0, 1, 1], [1, 1, 0]], 
  [[1, 1, 0], [0, 1, 1]]  
];

// fonction pour pivoter la forme de 90 degres
const getRotatedShape = (shape: number[][]) => {
  return shape[0].map((_, index) => shape.map(row => row[index]).reverse());
};

// fonction pour obtenir une couleur aleatoire
const getRandomColor = () => {
  const totalWeight = Object.values(colorConfig).reduce((sum, config) => sum + config.weight, 0);
  let random = Math.random() * totalWeight;
  for (const [color, config] of Object.entries(colorConfig)) {
    if (random < config.weight) return color;
    random -= config.weight;
  }
  return '#D92328';
};

// composant principal du jeu
const GameTetris = ({ initialLevelData, socket, roomCode }: TetrisProps) => {
  // etats du jeu
  const [board, setBoard] = useState<(string | null)[][]>([]);
  const [queue, setQueue] = useState<Piece[]>([]);
  const [availablePieces, setAvailablePieces] = useState<(Piece | null)[]>([null, null, null]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [turnIndex, setTurnIndex] = useState(0);
  
  // etats pour le glisser-deposer
  const [isDragging, setIsDragging] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverPos, setDragOverPos] = useState<{ r: number; c: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ r: number; c: number }>({ r: 0, c: 0 });

  // etats de l'adversaire
  const [opponentBoard, setOpponentBoard] = useState<(string | null)[][] | null>(null);
  const [opponentAvailablePieces, setOpponentAvailablePieces] = useState<(Piece | null)[]>([null, null, null]);
  const [opponentScore, setOpponentScore] = useState(0);

  const rows = initialLevelData?.rows || 8;
  const cols = initialLevelData?.cols || 8;

  // initialisation du plateau et de la file d'attente
  useEffect(() => {
    // generer 100 pieces
    const randomQueue = Array.from({ length: 100 }, () => ({
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      color: getRandomColor()
    }));

    const emptyBoard = Array.from({ length: rows }, () => Array(cols).fill(null));
    setBoard(emptyBoard);
    
    const finalQueue = (initialLevelData && initialLevelData.queue) ? initialLevelData.queue : randomQueue;
    
    // extraire les 3 premieres pieces
    const initialPieces = finalQueue.splice(0, 3);
    setAvailablePieces(initialPieces);
    setQueue(finalQueue);
  }, [initialLevelData, rows, cols]);

  // logique socket pour la synchronisation
  useEffect(() => {
    if (!socket) return;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleReceiveState = (data: any) => {
      setOpponentBoard(data.board);
      setOpponentAvailablePieces(data.availablePieces);
      setOpponentScore(data.score);
    };

    socket.on('receive_tetris_state', handleReceiveState);

    return () => {
      socket.off('receive_tetris_state', handleReceiveState);
    };
  }, [socket]);

  // envoyer l'etat local a l'adversaire
  useEffect(() => {
    if (!socket || !roomCode || board.length === 0) return;
    
    socket.emit('send_tetris_state', {
      roomCode,
      board,
      availablePieces,
      score
    });
  }, [board, availablePieces, score, socket, roomCode]);

  // fonction pour pivoter une piece specifique
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

  // verifier si la piece peut etre placee aux coordonnees
  const isValidPlacement = (checkBoard: (string | null)[][], startR: number, startC: number, shape: number[][]) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          const boardR = startR + r;
          const boardC = startC + c;
          
          if (boardR < 0 || boardR >= rows || boardC < 0 || boardC >= cols) return false;
          if (checkBoard[boardR][boardC] !== null) return false;
        }
      }
    }
    return true;
  };

  // verifier si la piece peut etre placee n'importe ou
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

  // placer la piece et gerer les points
  const placePiece = (startR: number, startC: number, pieceIndex: number) => {
    const piece = availablePieces[pieceIndex];
    if (!piece) return;

    const newBoard = board.map(row => [...row]);
    
    // ecrire les couleurs
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c] === 1) {
          newBoard[startR + r][startC + c] = piece.color;
        }
      }
    }

    // verifier les lignes completes
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

    // mettre a jour les pieces disponibles
    const newAvailable = [...availablePieces];
    newAvailable[pieceIndex] = null;

    let nextAvailable = newAvailable;
    let currentQueue = [...queue];
    let isOver = false;

    // recharger si tout est vide
    if (newAvailable.every(p => p === null)) {
      if (currentQueue.length < 3) {
        // regenerer des pieces si on manque
        const morePieces = Array.from({ length: 50 }, () => ({
          shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
          color: getRandomColor()
        }));
        currentQueue = [...currentQueue, ...morePieces];
      }
      nextAvailable = currentQueue.splice(0, 3);
      setQueue(currentQueue);
    }

    // verifier si on peut encore jouer avec les pieces restantes/nouvelles
    if (nextAvailable.every(p => p === null || !canPlaceAnywhere(newBoard, p))) {
      isOver = true;
    }

    setBoard(newBoard);
    setAvailablePieces(nextAvailable);
    if (isOver) setGameOver(true);
    setTurnIndex(prev => prev + 1);
  };

  // gerer le temps ecoule
  const handleTimeout = () => {
    if (gameOver) return;
    
    // trouver la premiere piece jouable
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

  // gerer le survol
  const isHoverCell = (r: number, c: number) => {
    if (!dragOverPos || !draggedPiece || !isDragging) return false;
    const dr = r - adjustedR;
    const dc = c - adjustedC;
    if (dr >= 0 && dr < draggedPiece.shape.length && dc >= 0 && dc < draggedPiece.shape[0].length) {
      return draggedPiece.shape[dr][dc] === 1;
    }
    return false;
  };

  // evenements de glisser-deposer
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

  const handleDragOver = (e: React.DragEvent, r: number, c: number) => {
    e.preventDefault();
    setDragOverPos({ r, c });
  };

  const handleDrop = (e: React.DragEvent, r: number, c: number) => {
    e.preventDefault();
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

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ color: 'var(--lego-blue)', marginBottom: '10px' }}>casse-briques (blast)</h2>
      
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '40px', flexWrap: 'wrap' }}>
        
        {/* zone joueur principal */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '10px 0', color: 'var(--lego-red)' }}>
            score : {score}
          </div>

          {!gameOver ? (
            <>
              <Timer timeLimit={15} onTimeout={handleTimeout} resetKey={turnIndex} />
              
              <div style={{ margin: '20px 0' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-grey)' }}>briques disponibles :</h4>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                  {availablePieces.map((piece, idx) => (
                    <div key={idx} style={{ 
                      padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', 
                      borderRadius: '12px', display: 'flex', flexDirection: 'column', 
                      alignItems: 'center', width: '110px', height: '110px' 
                    }}>
                      {piece ? (
                        <>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div 
                              draggable
                              onDragStart={(e) => handleDragStart(e, idx)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => handleRotate(idx, e)}
                              style={{ 
                                display: 'grid', 
                                gridTemplateColumns: `repeat(${piece.shape[0].length}, 25px)`,
                                gridTemplateRows: `repeat(${piece.shape.length}, 25px)`,
                                gap: '2px',
                                cursor: isDragging ? 'grabbing' : 'grab',
                                opacity: (isDragging && draggingIndex === idx) ? 0.5 : 1
                              }}
                            >
                              {piece.shape.map((row, rIdx) => 
                                row.map((cell, cIdx) => (
                                  <div 
                                    key={`${rIdx}-${cIdx}`} 
                                    onMouseDown={() => setDragOffset({ r: rIdx, c: cIdx })}
                                    style={{
                                      width: '25px', height: '25px',
                                      boxSizing: 'border-box',
                                      backgroundColor: cell ? piece.color : 'transparent',
                                      border: cell ? '1px solid rgba(0,0,0,0.1)' : '1px solid transparent',
                                      boxShadow: cell ? 'inset 0 0 8px rgba(0,0,0,0.2)' : 'none',
                                      borderRadius: '2px'
                                    }} 
                                  />
                                ))
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontStyle: 'italic', fontSize: '0.9rem' }}>
                          placé
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-grey)', marginTop: '10px', fontStyle: 'italic' }}>
                  cliquez pour pivoter, glissez pour placer
                </p>
              </div>

              {/* plateau de jeu */}
              <div 
                style={{
                  display: 'inline-grid',
                  gridTemplateColumns: `repeat(${cols}, 35px)`,
                  gridTemplateRows: `repeat(${rows}, 35px)`,
                  gap: '2px',
                  backgroundColor: '#e2e8f0',
                  border: '4px solid #333',
                  padding: '2px',
                  margin: '0 auto'
                }}
                onDragLeave={() => setDragOverPos(null)}
              >
                {board.map((row, r) => 
                  row.map((color, c) => {
                    const hovered = isHoverCell(r, c);
                    const validHover = hovered && draggedPiece && isValidPlacement(board, adjustedR, adjustedC, draggedPiece.shape);
                    
                    return (
                      <div
                        key={`${r}-${c}`}
                        onDragOver={(e) => handleDragOver(e, r, c)}
                        onDrop={(e) => handleDrop(e, r, c)}
                        style={{
                          width: '100%', height: '100%',
                          boxSizing: 'border-box',
                          backgroundColor: color ? color : (validHover ? draggedPiece.color : '#ffffff'),
                          opacity: hovered && !color ? (validHover ? 0.6 : 0.2) : 1,
                          border: '1px solid rgba(0,0,0,0.1)',
                          boxShadow: color || hovered ? 'inset 0 0 8px rgba(0,0,0,0.2)' : 'none',
                          transition: 'background-color 0.1s'
                        }}
                      />
                    )
                  })
                )}
              </div>

              {/* bareme des points */}
              <div style={{ marginTop: '25px', padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'inline-block', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-grey)' }}>barème des points (par ligne) :</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-grey)', fontSize: '0.9rem' }}>
                  {Object.entries(colorConfig).map(([color, config]) => (
                    <li key={color} style={{ marginBottom: '5px' }}>
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: color, marginRight: '8px', border: '1px solid #000' }}></span>
                      <strong>{config.name}</strong> : {config.points} pts
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', padding: '30px', borderRadius: '15px', margin: '20px 0' }}>
              <h2 style={{ color: '#166534' }}>partie terminée !</h2>
              <p style={{ fontSize: '1.2rem' }}>plus aucun bloc ne peut être placé.</p>
              <p style={{ fontSize: '1.2rem' }}>votre score final est de : <strong>{score}</strong> points</p>
              <button 
                className="btn-lego btn-blue" 
                style={{ marginTop: '15px' }} 
                onClick={() => window.location.reload()}
              >
                rejouer
              </button>
            </div>
          )}
        </div>

        {/* zone adversaire (multijoueur) */}
        {socket && roomCode && (
          <div style={{ width: '220px', padding: '20px', background: '#f8fafc', borderRadius: '15px', border: '2px dashed #cbd5e1', opacity: 0.9 }}>
            <h3 style={{ color: 'var(--text-dark)', margin: '0 0 15px 0' }}>adversaire ⚔️</h3>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px', color: 'var(--lego-blue)' }}>
              score : {opponentScore}
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-grey)', marginBottom: '8px', fontWeight: 'bold' }}>briques en cours :</div>
              <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                {opponentAvailablePieces.map((piece, idx) => (
                  <div key={idx} style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    {piece ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${piece.shape[0].length}, 10px)`,
                        gridTemplateRows: `repeat(${piece.shape.length}, 10px)`,
                        gap: '1px'
                      }}>
                        {piece.shape.map((r, rIdx) => 
                          r.map((cell, cIdx) => (
                            <div key={`opp-p-${rIdx}-${cIdx}`} style={{ 
                              width: '10px', height: '10px', 
                              boxSizing: 'border-box',
                              backgroundColor: cell ? piece.color : 'transparent',
                              border: cell ? '1px solid rgba(0,0,0,0.2)' : '1px solid transparent',
                              borderRadius: '1px'
                            }} />
                          ))
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>placé</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '0.9rem', color: 'var(--text-grey)', marginBottom: '8px', fontWeight: 'bold' }}>grille :</div>
            <div style={{
              display: 'inline-grid',
              gridTemplateColumns: `repeat(${cols}, 15px)`,
              gridTemplateRows: `repeat(${rows}, 15px)`,
              gap: '1px',
              backgroundColor: '#94a3b8',
              border: '3px solid #334155',
              padding: '1px',
              margin: '0 auto',
              borderRadius: '4px'
            }}>
              {(opponentBoard || Array.from({ length: rows }, () => Array(cols).fill(null))).map((row, r) =>
                row.map((color, c) => (
                  <div key={`opp-b-${r}-${c}`} style={{
                    backgroundColor: color || '#f1f5f9',
                    width: '100%', height: '100%',
                    boxShadow: color ? 'inset 0 0 4px rgba(0,0,0,0.2)' : 'none'
                  }} />
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GameTetris;