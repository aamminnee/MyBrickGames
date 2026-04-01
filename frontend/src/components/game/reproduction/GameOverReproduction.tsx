import { useEffect, useState } from 'react';
import '../../CSS/GameOverReproduction.css';

interface GameOverProps {
  score: number;
  mode: string;
  result: string;
  difficulty: string;
  onRestart: () => void;
  onReturnHome: () => void;
}

const GameOverReproduction = ({ score, mode, result, difficulty, onRestart, onReturnHome }: GameOverProps) => {
  const [pointsSaved, setPointsSaved] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  useEffect(() => {
    const saveScore = async () => {
      const loyaltyId = localStorage.getItem('loyalty_id');

      if (loyaltyId && !pointsSaved) {
        try {
          const response = await fetch(`http://localhost:3000/api/player/${loyaltyId}/game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameId: 'reproduction',
              score,
              mode,
              result,
              difficulty,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setPointsEarned(data.pointsEarned);
            setPointsSaved(true);
          }
        } catch (error) {
          console.error('erreur lors de la sauvegarde du score:', error);
        }
      }
    };

    saveScore();
  }, [score, mode, result, difficulty, pointsSaved]);

  return (
    <div className="reproduction-gameover-panel">
      <h2 className="reproduction-gameover-title">PARTIE TERMINÉE</h2>

      <div className="gameover-score-block">
        <span className="gameover-score-label">précision</span>
        <span className="gameover-score-value">{score}<span className="gameover-score-unit">%</span></span>
      </div>

      <div className="gameover-points-row">
        {pointsSaved ? (
          <p className="gameover-points-earned">
            <span className="gameover-points-plus">+{pointsEarned}</span>
            {' '}points de fidélité gagnés
          </p>
        ) : (
          <p className="gameover-points-saving">sauvegarde en cours…</p>
        )}
      </div>

      <div className="reproduction-gameover-btn">
        <button className="gameover-btn gameover-btn-restart" onClick={onRestart}>
          rejouer
        </button>
        <button className="gameover-btn gameover-btn-quit" onClick={onReturnHome}>
          quitter
        </button>
      </div>
    </div>
  );
};

export default GameOverReproduction;