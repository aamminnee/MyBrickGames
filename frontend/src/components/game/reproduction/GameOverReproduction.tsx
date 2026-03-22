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
  // etat pour savoir si les points ont ete sauvegardes
  const [pointsSaved, setPointsSaved] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  useEffect(() => {
    const saveScore = async () => {
      const loyaltyId = localStorage.getItem('loyalty_id');
      
      if (loyaltyId && !pointsSaved) {
        try {
          // envoi complet avec mode et resultat pour les statistiques
          const response = await fetch(`http://localhost:3000/api/player/${loyaltyId}/game`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              gameId: 'reproduction',
              score: score,
              mode: mode,
              result: result,
              difficulty: difficulty
            })
          });

          if (response.ok) {
            const data = await response.json();
            setPointsEarned(data.pointsEarned);
            setPointsSaved(true);
          }
        } catch (error) {
          console.error("erreur lors de la sauvegarde du score:", error);
        }
      }
    };

    saveScore();
  }, [score, mode, result, difficulty, pointsSaved]);

  return (
    <div className="reproduction-gameover-panel">
      <h2 className="reproduction-gameover-title">partie terminée !</h2>
      <div className="score-display">
        <p className="reproduction-gameover-text">précision de la reproduction : <strong>{score}%</strong></p>
        
        {pointsSaved ? (
          <p style={{ color: 'var(--lego-red)', fontWeight: 'bold' }}>
            +{pointsEarned} points de fidélité gagnés !
          </p>
        ) : (
          <p>sauvegarde en cours...</p>
        )}
      </div>

      <div style={{ marginTop: '15px' }}>
        <button onClick={onRestart} className="btn-lego btn-blue" style={{ width: 'auto', marginRight: '10px' }}>rejouer</button>
        <button onClick={onReturnHome} className="btn-lego btn-red" style={{ width: 'auto' }}>quitter</button>
      </div>
    </div>
  );
};

export default GameOverReproduction;