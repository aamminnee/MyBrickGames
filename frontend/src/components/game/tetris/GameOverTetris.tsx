import { useEffect, useState } from 'react';
import '../../CSS/GameOverTetris.css';

interface GameOverTetrisProps {
  score: number;
  lines: number;
  onRestart: () => void;
  onReturnHome: () => void;
}

const GameOverTetris = ({ score, lines, onRestart, onReturnHome }: GameOverTetrisProps) => {
  const [pointsSaved, setPointsSaved] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  useEffect(() => {
    const saveTetrisScore = async () => {
      const loyaltyId = localStorage.getItem('loyalty_id');
      
      if (loyaltyId && !pointsSaved) {
        try {
          const response = await fetch(`http://localhost:3000/api/player/${loyaltyId}/game`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              gameId: 'tetris',
              score: score
            })
          });

          if (response.ok) {
            const data = await response.json();
            setPointsEarned(data.pointsEarned);
            setPointsSaved(true);
          }
        } catch (error) {
          console.error("api error:", error);
        }
      }
    };

    saveTetrisScore();
  }, [score, pointsSaved]);

  return (
    <div className="game-over-tetris">
      <h2>fin de partie</h2>
      
      <div className="stats-container">
        <p>lignes complétées : <strong>{lines}</strong></p>
        <p>score final : <strong>{score}</strong></p>
        
        {pointsSaved && (
          <div className="loyalty-reward">
            <span>+{pointsEarned} points de fidélité</span>
          </div>
        )}
      </div>

      <div className="actions-container">
        <button onClick={onRestart} className="btn-restart-tetris">nouvelle partie</button>
        <button onClick={onReturnHome} className="btn-home-tetris">quitter</button>
      </div>
    </div>
  );
};

export default GameOverTetris;