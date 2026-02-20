import { useState, useEffect } from 'react';
import Board from '../components/game/Board';
import Timer from '../components/game/Timer';

const GameReproduction = () => {
  // --- NOUVEAU : États pour stocker les données du serveur ---
  const [loading, setLoading] = useState(true);
  const [targetGrid, setTargetGrid] = useState<(string | null)[][]>([]);
  const [rows, setRows] = useState(0);
  const [cols, setCols] = useState(0);

  // --- États du jeu ---
  const [grid, setGrid] = useState<(string | null)[][]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [currentBrick, setCurrentBrick] = useState<string | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  // --- NOUVEAU : Récupération des données au démarrage ---
  useEffect(() => {
    fetch('http://localhost:3000/api/mosaic/random')
      .then(res => res.json())
      .then(data => {
        setTargetGrid(data.targetGrid);
        setRows(data.rows);
        setCols(data.cols);
        setQueue(data.bricksQueue);
        setCurrentBrick(data.bricksQueue[0]);
        // On génère la grille vide à la bonne taille
        setGrid(Array(data.rows).fill(null).map(() => Array(data.cols).fill(null)));
        setLoading(false);
      })
      .catch(err => console.error("Erreur de chargement:", err));
  }, []);

  // --- Le reste de la logique ne change presque pas ---
  const nextTurn = (newGrid: (string | null)[][], currentQueue: string[]) => {
    const newQueue = [...currentQueue];
    newQueue.shift(); 
    
    if (newQueue.length === 0) {
      endGame(newGrid);
    } else {
      setQueue(newQueue);
      setCurrentBrick(newQueue[0]);
      setTurnIndex(prev => prev + 1); 
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (gameOver || !currentBrick || grid[r][c] !== null) return; 

    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = currentBrick;
    setGrid(newGrid);
    nextTurn(newGrid, queue);
  };

  const handleTimeout = () => {
    if (gameOver || !currentBrick) return;

    const emptyCells: {r: number, c: number}[] = [];
    grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell === null) emptyCells.push({r, c});
      });
    });

    if (emptyCells.length > 0) {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const newGrid = grid.map(r => [...r]);
      newGrid[randomCell.r][randomCell.c] = currentBrick;
      setGrid(newGrid);
      nextTurn(newGrid, queue);
    }
  };

  const endGame = (finalGrid: (string | null)[][]) => {
    setGameOver(true);
    setCurrentBrick(null);
    
    let correctPlacements = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (finalGrid[r][c] === targetGrid[r][c] && finalGrid[r][c] !== null) {
          correctPlacements++;
        }
      }
    }
    setScore(correctPlacements);
  };

  // --- Affichage ---
  if (loading) {
    return <h2 style={{ textAlign: 'center', marginTop: '50px' }}>Chargement du niveau... ⏳</h2>;
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <h2>Jeu 1 : Reproduction d'image 🖼️</h2>

      {!gameOver ? (
        <>
          <Timer timeLimit={5} onTimeout={handleTimeout} resetKey={turnIndex} />
          
          <div style={{ margin: '20px', padding: '10px', background: '#f4f4f4', display: 'inline-block', borderRadius: '8px' }}>
            <h3>Brique à placer :</h3>
            <div style={{ width: '50px', height: '50px', background: currentBrick || 'transparent', margin: '0 auto', border: '2px solid #333' }} />
          </div>

          <p>Cliquez sur une case vide de votre plateau ci-dessous !</p>
          <Board rows={rows} cols={cols} gridData={grid} onCellClick={handleCellClick} />
        </>
      ) : (
        <div style={{ background: '#e1f5fe', padding: '30px', borderRadius: '10px', display: 'inline-block' }}>
          <h2>Partie Terminée ! 🎉</h2>
          <p style={{ fontSize: '20px' }}>Votre score : <strong>{score}</strong> bonnes briques !</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', cursor: 'pointer', marginTop: '10px' }}>
            Rejouer
          </button>
        </div>
      )}

      <div style={{ marginTop: '40px', opacity: 0.7 }}>
        <h4>Image Cible (Objectif) :</h4>
        <div style={{ transform: 'scale(0.5)', transformOrigin: 'top center' }}>
          <Board rows={rows} cols={cols} gridData={targetGrid} />
        </div>
      </div>
    </div>
  );
};

export default GameReproduction;