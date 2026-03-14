import { useState, useEffect } from 'react';
import Board from '../Board';
import type { BrickObj } from '../Board';
import Timer from '../Timer';
import { isOccupied, createSeededRNG } from '../../../utils/gameUtils';
import DifficultySelector, { type Difficulty } from './DifficultySelector';
import TargetModel from './TargetModel';
import GameOverReproduction from './GameOverReproduction';
import ActiveBrick from './ActiveBrick';

// configuration des difficultes
const LEVEL_CONFIG = {
  easy: { maxLevels: 5, label: 'facile (8x8)' },
  normal: { maxLevels: 1, label: 'moyen (10x10)' },
  hard: { maxLevels: 10, label: 'difficile (12x12)' }
};

interface ReproductionGameProps {
  roomCode?: string;
}

const ReproductionGame = ({ roomCode }: ReproductionGameProps) => {
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

  // envoi automatique des points au backend quand la partie se termine
  useEffect(() => {
    if (gameOver) {
      const percentage = Math.round((score / (rows * cols)) * 100);
      const loyaltyId = localStorage.getItem('loyaltyId') || 'joueur_test_123';
      fetch(`http://localhost:3000/api/player/${loyaltyId}/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: 'reproduction', score: percentage })
      }).catch(err => console.error("erreur d'envoi du score:", err));
    }
  }, [gameOver, score, rows, cols]);

  // charger le niveau de jeu (le meme pour les 2 joueurs s'ils choisissent la meme difficulte)
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

  // recuperer les details du niveau au montage
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

        // melange deterministe des briques base sur le code du salon
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

  // passer a la brique suivante dans la file
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

  // definir l'etat de la position de survol
  const handleCellHover = (r: number, c: number) => {
    if (gameOver || !currentBrick) return;
    if (r + currentBrick.h > rows || c + currentBrick.w > cols) {
      setHoverPos(null);
      return;
    }
    setHoverPos({ r, c });
  };

  // gerer le depot de la brique sur la grille
  const handleCellDrop = (r: number, c: number) => {
    if (gameOver || !currentBrick) return;
    if (r + currentBrick.h > rows || c + currentBrick.w > cols) return; 
    
    if (isOccupied(r, c, currentBrick.w, currentBrick.h, placedBricks)) return;

    const newBrick: BrickObj = { x: c, y: r, w: currentBrick.w, h: currentBrick.h, color: currentBrick.color };
    const newPlaced = [...placedBricks, newBrick];
    setPlacedBricks(newPlaced);
    nextTurn(newPlaced, queue);
  };

  // jouer un coup aleatoire automatiquement a la fin du temps imparti
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

  // verifier le score final par rapport a la cible
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

  // afficher le selecteur de difficulte si aucun niveau n'est choisi
  if (!levelPath) {
    return <DifficultySelector onSelect={startGame} />;
  }

  // afficher l'etat de chargement
  if (loading) return <h2>chargement du niveau... ⏳</h2>;

  const currentPreview = currentBrick ? [{ x: 0, y: 0, w: currentBrick.w, h: currentBrick.h, color: currentBrick.color }] : undefined;

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ color: 'var(--lego-blue)', marginBottom: '10px' }}>reproduction ({rows}x{cols})</h2>

      {/* on passe les targetbricks au lieu du chemin de l'image */}
      <TargetModel targetBricks={targetBricks} rows={rows} cols={cols} />

      {!gameOver ? (
        <>
          <Timer timeLimit={15} onTimeout={handleTimeout} resetKey={turnIndex} />
          
          <ActiveBrick currentBrick={currentBrick} onDragEnd={() => setHoverPos(null)} />

          <br />
          
         <Board 
            rows={rows} 
            cols={cols} 
            bricks={placedBricks} 
            onCellDrop={handleCellDrop} 
            onCellHover={handleCellHover}
            onMouseLeave={() => setHoverPos(null)}
            previewBricks={currentPreview}
            hoverPos={hoverPos}
            cellSize={30} 
          />
        </>
      ) : (
        <GameOverReproduction 
          score={score} 
          onRestart={() => window.location.reload()} 
          onReturnHome={() => window.location.href = '/'}
        />
      )}
    </div>
  );
};

export default ReproductionGame;