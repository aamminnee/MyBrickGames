import { useState, useEffect, useRef } from 'react';
import Board from '../Board';
import type { BrickObj } from '../Board';
import Timer from '../Timer';
import { isOccupied, createSeededRNG } from '../../../utils/gameUtils';
import DifficultySelector, { type Difficulty } from './DifficultySelector';
import TargetModel from './TargetModel';
import GameOverReproduction from './GameOverReproduction';
import ActiveBrick from './ActiveBrick';
import { Socket } from 'socket.io-client';
import '../../CSS/ReproductionGame.css';
import backgroundImage from '../../../assets/arcade.jpg';


// configuration des niveaux
const LEVEL_CONFIG = {
  easy: { maxLevels: 3, label: 'facile (8x8)' },
  normal: { maxLevels: 3, label: 'moyen (10x10)' },
  hard: { maxLevels: 1, label: 'difficile (12x12)' }
};

interface ReproductionGameProps {
  roomCode?: string;
  socket?: Socket; 
  initialDifficulty?: string;
  isHost?: boolean;
}

const ReproductionGame = ({ roomCode, socket, initialDifficulty, isHost }: ReproductionGameProps) => {
  const [levelPath, setLevelPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);

  const [targetBricks, setTargetBricks] = useState<BrickObj[]>([]);
  const [placedBricks, setPlacedBricks] = useState<BrickObj[]>([]);
  
  const [queue, setQueue] = useState<Omit<BrickObj, 'x' | 'y'>[]>([]);
  const [currentBrick, setCurrentBrick] = useState<Omit<BrickObj, 'x' | 'y'> | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [hoverPos, setHoverPos] = useState<{ r: number, c: number } | null>(null);

  // état de l'adversaire
  const [opponentBricks, setOpponentBricks] = useState<BrickObj[]>([]);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  
  const gameStartedRef = useRef(false);

  // charger le niveau de jeu
  const startGame = (diff: Difficulty) => {
    setLoading(true);
    
    const max = LEVEL_CONFIG[diff].maxLevels;
    const rngLevel = roomCode ? createSeededRNG(roomCode + "level") : Math.random;
    const randomId = Math.floor(rngLevel() * max) + 1; 
    
    setLevelPath(`levels/${diff}/${randomId}`); 
    setGameOver(false);
    setPlacedBricks([]);
    setScore(0);
    setTurnIndex(0);
  };

  // démarrage auto si l'hôte a choisi la difficulté
  useEffect(() => {
    if (initialDifficulty && !levelPath && !gameStartedRef.current) {
      gameStartedRef.current = true;
      startGame(initialDifficulty as Difficulty);
    }
  }, [initialDifficulty, levelPath]);

  // récupérer les détails du niveau au montage
  useEffect(() => {
    if (!levelPath) return;

    fetch(`/${levelPath}.txt`)
      .then(res => {
        if (!res.ok) throw new Error("fichier introuvable.");
        return res.text();
      })
      .then(text => {
        const lines = text.trim().split('\n');
        
        const parsedBricks: BrickObj[] = [];
        let maxR = 0;
        let maxC = 0;

        lines.forEach(line => {
          const parts = line.trim().split(' ');
          if (parts.length < 4) return;
          
          const [dimColor, xStr, yStr, rotStr] = parts;
          const [dim, color] = dimColor.split('/');
          let [w, h] = dim.split('x').map(Number);
          const x = Number(xStr);
          const y = Number(yStr);
          const rot = Number(rotStr);

          if (rot === 1) {
            const temp = w; w = h; h = temp;
          }

          parsedBricks.push({ x, y, w, h, color: '#' + color });
          if (x + w > maxC) maxC = x + w;
          if (y + h > maxR) maxR = y + h;
        });

        setRows(maxR);
        setCols(maxC);
        setTargetBricks(parsedBricks);

        const rngShuffle = roomCode ? createSeededRNG(roomCode + levelPath) : Math.random;
        const initialQueue = parsedBricks
          .map(b => ({ w: b.w, h: b.h, color: b.color }))
          .sort(() => rngShuffle() - 0.5);

        setQueue(initialQueue);
        setCurrentBrick(initialQueue[0]);
        setLoading(false);
      })
      .catch(err => {
        console.error("erreur :", err);
        setLoading(false);
      });
  }, [levelPath, roomCode]);

  // gérer la réception de l'état de l'adversaire
  useEffect(() => {
    if (!socket) return;
    const handleReceiveState = (data: any) => {
       setOpponentBricks(data.placedBricks || []);
       setOpponentScore(data.score || 0);
       
       // si le joueur est l'invité et qu'il reçoit la difficulté de l'hôte
       if (!isHost && data.difficulty && !gameStartedRef.current) {
           gameStartedRef.current = true;
           startGame(data.difficulty as Difficulty);
       }
    };
    
    socket.on('receive_repro_state', handleReceiveState);
    // on écoute aussi l'événement tetris au cas où le backend ne relaie que celui-là
    socket.on('receive_tetris_state', handleReceiveState);
    
    return () => {
      socket.off('receive_repro_state', handleReceiveState);
      socket.off('receive_tetris_state', handleReceiveState);
    };
  }, [socket, isHost]);

  // gérer l'envoi de son propre état
  useEffect(() => {
    if (!socket || !roomCode || targetBricks.length === 0) return;
    
    // calculer le pourcentage actuel à partager avec l'adversaire
    let currentCorrect = 0;
    const currentGridMap = Array(rows).fill(null).map(() => Array(cols).fill(null));
    placedBricks.forEach(b => {
      for(let i=0; i<b.h; i++) for(let j=0; j<b.w; j++) currentGridMap[b.y + i][b.x + j] = b.color;
    });
    const targetGridMap = Array(rows).fill(null).map(() => Array(cols).fill(null));
    targetBricks.forEach(b => {
      for(let i=0; i<b.h; i++) for(let j=0; j<b.w; j++) targetGridMap[b.y + i][b.x + j] = b.color;
    });
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (currentGridMap[r][c] === targetGridMap[r][c] && currentGridMap[r][c] !== null) currentCorrect++;
      }
    }
    const targetTotalArea = targetBricks.reduce((acc, b) => acc + (b.w * b.h), 0);
    const currentPercentage = targetTotalArea > 0 ? Math.round((currentCorrect / targetTotalArea) * 100) : 0;
    const currentDifficulty = levelPath?.split('/')[1] || 'normal';

    const payload = { 
        roomCode, 
        placedBricks, 
        score: currentPercentage,
        difficulty: currentDifficulty
    };

    socket.emit('send_repro_state', payload);
    // on utilise aussi le canal tetris pour forcer le backend à relayer la difficulté à l'invité
    socket.emit('send_tetris_state', payload);
  }, [placedBricks, socket, roomCode, targetBricks, rows, cols, levelPath]);

  // passer à la brique suivante dans la file
  const nextTurn = (newPlaced: BrickObj[], currentQueue: Omit<BrickObj, 'x' | 'y'>[]) => {
    const newQueue = [...currentQueue];
    newQueue.shift(); 
    if (newQueue.length === 0) endGame(newPlaced);
    else {
      setQueue(newQueue);
      setCurrentBrick(newQueue[0]);
      setTurnIndex(prev => prev + 1); 
    }
  };

  const handleCellHover = (r: number, c: number) => {
    if (gameOver || !currentBrick) return;
    if (r + currentBrick.h > rows || c + currentBrick.w > cols) {
      setHoverPos(null);
      return;
    }
    setHoverPos({ r, c });
  };

  const handleCellDrop = (r: number, c: number) => {
    if (gameOver || !currentBrick) return;
    if (r + currentBrick.h > rows || c + currentBrick.w > cols) return; 
    
    if (isOccupied(r, c, currentBrick.w, currentBrick.h, placedBricks)) return;

    const newBrick: BrickObj = { x: c, y: r, w: currentBrick.w, h: currentBrick.h, color: currentBrick.color };
    const newPlaced = [...placedBricks, newBrick];
    setPlacedBricks(newPlaced);
    nextTurn(newPlaced, queue);
  };

  const handleTimeout = () => {
    if (gameOver || !currentBrick) return;
    const validCells: {r: number, c: number}[] = [];
    
    for (let r = 0; r <= rows - currentBrick.h; r++) {
      for (let c = 0; c <= cols - currentBrick.w; c++) {
        if (!isOccupied(r, c, currentBrick.w, currentBrick.h, placedBricks)) {
          validCells.push({r, c});
        }
      }
    }

    if (validCells.length > 0) {
      const timeoutRng = roomCode ? createSeededRNG(roomCode + turnIndex) : Math.random;
      const randomCell = validCells[Math.floor(timeoutRng() * validCells.length)];
      const newBrick: BrickObj = { x: randomCell.c, y: randomCell.r, w: currentBrick.w, h: currentBrick.h, color: currentBrick.color };
      const newPlaced = [...placedBricks, newBrick];
      setPlacedBricks(newPlaced);
      nextTurn(newPlaced, queue);
    } else {
      nextTurn(placedBricks, queue);
    }
  };

  const endGame = (finalBricks: BrickObj[]) => {
    setGameOver(true);
    setCurrentBrick(null);
    
    const finalGridMap = Array(rows).fill(null).map(() => Array(cols).fill(null));
    finalBricks.forEach(b => {
      for(let i=0; i<b.h; i++) for(let j=0; j<b.w; j++) finalGridMap[b.y + i][b.x + j] = b.color;
    });
    
    const targetGridMap = Array(rows).fill(null).map(() => Array(cols).fill(null));
    targetBricks.forEach(b => {
      for(let i=0; i<b.h; i++) for(let j=0; j<b.w; j++) targetGridMap[b.y + i][b.x + j] = b.color;
    });

    let correct = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (finalGridMap[r][c] === targetGridMap[r][c] && finalGridMap[r][c] !== null) correct++;
      }
    }
    setScore(correct);
  };

  if (!levelPath) {
    if (roomCode && !isHost) {
      return (
        <div className="reproduction-diff-container">
          <h2 className="reproduction-diff-title">reproduction</h2>
          <h3 style={{marginTop: "50px", color: "var(--lego-blue)"}}>en attente de la configuration de l'hôte... ⏳</h3>
        </div>
      );
    }
    if (initialDifficulty) {
    /* Correction de la couleur pour que le texte soit visible */
      return <h2 style={{marginTop: "50px", color: "var(--neon-cyan)", textAlign: 'center'}}>préparation du niveau... ⏳</h2>;
    }
    return <DifficultySelector onSelect={startGame} />;
  }

  if (loading) return <h2 style={{color: "var(--neon-cyan)", textAlign: 'center'}}>chargement du niveau... ⏳</h2>;

  const currentPreview = currentBrick ? [{ x: 0, y: 0, w: currentBrick.w, h: currentBrick.h, color: currentBrick.color }] : undefined;

  // déterminer les statistiques pour l'envoi à la base de données
  const targetTotalArea = targetBricks.reduce((acc, b) => acc + (b.w * b.h), 0);
  const percentage = targetTotalArea > 0 ? Math.round((score / targetTotalArea) * 100) : 0;
  const mode = roomCode ? 'multi' : 'solo';
  
  // calculer la victoire en multijoueur ou en solo
  let result = 'none';
  if (mode === 'multi') {
      if (percentage > opponentScore) result = 'win';
      else if (percentage < opponentScore) result = 'loss';
      else result = 'draw';
  } else {
      result = percentage >= 80 ? 'win' : 'loss';
  }
  

  const difficulty = levelPath?.split('/')[1] || 'normal';

  // --- NOUVEAU RENDU VISUEL (3 COLONNES AVEC BEAUX CONTENEURS) ---
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
        
        {/* ⬅️ COLONNE DE GAUCHE : L'objectif et les outils */}
        <div className="repro-side-panel">
          
          {/* Le panneau du modèle à reproduire */}
          <div className="arcade-panel panel-magenta">
            <div className="arcade-panel-header">MODÈLE CIBLE</div>
            <div className="arcade-panel-content">
              <TargetModel targetBricks={targetBricks} rows={rows} cols={cols} />
            </div>
          </div>

          {/* Le panneau pour la brique actuelle */}
          {!gameOver && (
            <div className="arcade-panel panel-cyan">
              <div className="arcade-panel-header">BRIQUE EN MAIN</div>
              <div className="arcade-panel-content">
                <ActiveBrick currentBrick={currentBrick} onDragEnd={() => setHoverPos(null)} />
              </div>
            </div>
          )}
          
        </div>

        {/* ⬇️ COLONNE CENTRALE : Le terrain de jeu */}
        <div className="repro-center-panel">
          <div className="arcade-panel panel-cyan" style={{ width: '100%' }}>
            <div className="arcade-panel-header">GRILLE DU JOUEUR ({rows}x{cols})</div>
            <div className="arcade-panel-content">
              
              {!gameOver ? (
                <Board 
                  rows={rows} 
                  cols={cols} 
                  bricks={placedBricks} 
                  onCellDrop={handleCellDrop} 
                  onCellHover={handleCellHover}
                  onMouseLeave={() => setHoverPos(null)}
                  previewBricks={currentPreview}
                  hoverPos={hoverPos}
                  cellSize={45} 
                />
              ) : (
                <div className="reproduction-gameover-panel" style={{ textAlign: 'center', width: '100%' }}>
                    <GameOverReproduction 
                    score={percentage} 
                    mode={mode}
                    result={result}
                    difficulty={difficulty}
                    onRestart={() => window.location.reload()} 
                    onReturnHome={() => { window.location.href = '/'; }}
                  />
                  {roomCode && (
                      <div className="multiplayer-result" style={{ marginTop: '20px' }}>
                        <p style={{ fontFamily: 'var(--font-heading)', color: result === 'win' ? 'var(--neon-green)' : result === 'loss' ? 'var(--neon-magenta)' : 'var(--neon-yellow)' }}>
                          {result === 'win' ? "🏆 VOUS AVEZ GAGNÉ ! 🏆" : (result === 'loss' ? "❌ VOUS AVEZ PERDU... ❌" : "🤝 C'EST UNE ÉGALITÉ ! 🤝")}
                        </p>
                      </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ➡️ COLONNE DE DROITE : Le temps et l'adversaire */}
        <div className="repro-side-panel">
          
          {/* Le panneau du chrono */}
          {!gameOver && (
            <div className="arcade-panel panel-yellow">
              <div className="arcade-panel-header">TEMPS RESTANT</div>
              <div className="arcade-panel-content">
                <Timer timeLimit={15} onTimeout={handleTimeout} resetKey={turnIndex} />
              </div>
            </div>
          )}

          {/* Le panneau des contrôles (Valider / Abandonner) */}
          {!gameOver && (
            <div className="arcade-panel panel-magenta">
              <div className="arcade-panel-header">CONTRÔLES</div>
              <div className="arcade-panel-content" style={{ width: '100%', gap: '15px' }}>
                <button className="btn-lego btn-green" onClick={handleTimeout} style={{ width: '100%' }}>
                  PASSER LE TOUR
                </button>
                <button className="btn-lego btn-red" onClick={() => endGame(placedBricks)} style={{ width: '100%' }}>
                  VALIDER & FINIR
                </button>
              </div>
            </div>
          )}

          {/* Panneau de l'adversaire (Multijoueur uniquement) */}
          {socket && roomCode && (
            <div className="arcade-panel panel-magenta">
              <div className="arcade-panel-header">ADVERSAIRE ⚔️</div>
              <div className="arcade-panel-content">
                
                <div style={{ color: 'var(--neon-cyan)', marginBottom: '15px', fontFamily: 'var(--font-heading)', fontSize: '0.8rem' }}>
                  PRÉCISION : {opponentScore}%
                </div>

                <Board 
                  rows={rows}
                  cols={cols}
                  bricks={opponentBricks}
                  cellSize={15}
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

export default ReproductionGame;