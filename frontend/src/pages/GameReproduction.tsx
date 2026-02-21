import { useState, useEffect } from 'react';
import Board from '../components/game/Board';
import type { BrickObj } from '../components/game/Board';
import Timer from '../components/game/Timer';

interface GameProps {
  initialLevelData?: any;
}

const GameReproduction = ({ initialLevelData }: GameProps) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState(0);
  const [cols, setCols] = useState(0);

  // Les nouveaux états !
  const [targetBricks, setTargetBricks] = useState<BrickObj[]>([]);
  const [placedBricks, setPlacedBricks] = useState<BrickObj[]>([]);
  
  const [queue, setQueue] = useState<Omit<BrickObj, 'x' | 'y'>[]>([]);
  const [currentBrick, setCurrentBrick] = useState<Omit<BrickObj, 'x' | 'y'> | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const loadLevel = (data: any) => {
    setTargetBricks(data.targetBricks); // L'objectif a maintenant des bordures !
    setRows(data.rows);
    setCols(data.cols);
    setQueue(data.bricksQueue);
    setCurrentBrick(data.bricksQueue[0]);
    setPlacedBricks([]); // Plateau vide
    setLoading(false);
  };

  useEffect(() => {
    if (initialLevelData) {
      loadLevel(initialLevelData);
    } else {
      fetch('http://localhost:3000/api/mosaic/random')
        .then(res => res.json())
        .then(data => loadLevel(data))
        .catch(err => { console.error(err); setLoading(false); });
    }
  }, [initialLevelData]);

  const nextTurn = (newPlaced: BrickObj[], currentQueue: any[]) => {
    const newQueue = [...currentQueue];
    newQueue.shift(); 
    if (newQueue.length === 0) endGame(newPlaced);
    else {
      setQueue(newQueue);
      setCurrentBrick(newQueue[0]);
      setTurnIndex(prev => prev + 1); 
    }
  };

  // Fonction pour vérifier si une zone est libre
  const isOccupied = (r: number, c: number, w: number, h: number, bricks: BrickObj[]) => {
    return bricks.some(b => !(c + w <= b.x || c >= b.x + b.w || r + h <= b.y || r >= b.y + b.h));
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameOver || !currentBrick) return;
    if (r + currentBrick.h > rows || c + currentBrick.w > cols) return; // Dépasse le bord
    if (isOccupied(r, c, currentBrick.w, currentBrick.h, placedBricks)) return; // Case prise

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
      const randomCell = validCells[Math.floor(Math.random() * validCells.length)];
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
    
    // Pour calculer le score, on recrée virtuellement les deux grilles pixels par pixels
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

  if (loading) return <h2>Chargement... ⏳</h2>;

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ color: 'var(--lego-blue)', marginBottom: '10px' }}>Reproduction (16x16)</h2>

      {!gameOver ? (
        <>
          <Timer timeLimit={15} onTimeout={handleTimeout} resetKey={turnIndex} />
          <div style={{ margin: '15px 0', padding: '15px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'inline-block', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-grey)' }}>Prochaine Brique :</h4>
            {/* L'aperçu de la brique à placer utilise maintenant le même style ! */}
            <Board rows={currentBrick?.h || 1} cols={currentBrick?.w || 1} bricks={[{x:0, y:0, w: currentBrick?.w || 1, h: currentBrick?.h || 1, color: currentBrick?.color || '#fff'}]} cellSize={20} />
          </div>

          <Board rows={rows} cols={cols} bricks={placedBricks} onCellClick={handleCellClick} cellSize={30} />
        </>
      ) : (
        <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', padding: '30px', borderRadius: '15px', margin: '20px 0' }}>
          <h2 style={{ color: '#166534' }}>Terminé ! 🎉</h2>
          <p style={{ fontSize: '1.2rem' }}>Précision : <strong>{Math.round((score / (rows * cols)) * 100)}%</strong></p>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '20px', background: '#fff', borderRadius: '10px' }}>
        <h4 style={{ color: 'var(--text-grey)', marginBottom: '15px' }}>Objectif Miniature :</h4>
        {/* MAGIQUE : L'objectif s'affiche maintenant avec des bordures noires et des tenons ! */}
        <Board rows={rows} cols={cols} bricks={targetBricks} cellSize={15} />
      </div>
    </div>
  );
};

export default GameReproduction;