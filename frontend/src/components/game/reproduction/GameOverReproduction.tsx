import { useEffect, useState } from 'react';
import '../../CSS/GameOverReproduction.css';

interface GameOverProps {
  score: number;
  onRestart: () => void;
  onReturnHome: () => void;
}

const GameOverReproduction = ({ score, onRestart, onReturnHome }: GameOverProps) => {
  // state to know if points have been saved
  const [pointsSaved, setPointsSaved] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  // use effect to send score to backend as soon as screen is displayed
  useEffect(() => {
    const saveScore = async () => {
      // retrieve stored loyalty id
      const loyaltyId = localStorage.getItem('loyalty_id');
      
      if (loyaltyId && !pointsSaved) {
        try {
          // fixed api route to match the backend playerroutes.ts
          const response = await fetch(`http://localhost:3000/api/player/${loyaltyId}/game`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              gameId: 'reproduction',
              score: score
            })
          });

          if (response.ok) {
            const data = await response.json();
            // retrieve earned points calculated by backend
            setPointsEarned(data.pointsEarned);
            setPointsSaved(true);
            console.log("points successfully saved:", data);
          }
        } catch (error) {
          console.error("error while saving score:", error);
        }
      }
    };

    saveScore();
  }, [score, pointsSaved]);

  return (
    <div className="game-over-container">
      <h2>partie terminée !</h2>
      <div className="score-display">
        <p>votre score : <strong>{score}</strong></p>
        
        {/* dynamic display of earned points once confirmed by backend */}
        {pointsSaved ? (
          <p className="points-earned">
            vous avez gagné <strong>{pointsEarned}</strong> points de fidélité !
          </p>
        ) : (
          <p className="points-saving">sauvegarde de vos points en cours...</p>
        )}
      </div>

      <div className="game-over-actions">
        <button onClick={onRestart} className="btn-restart">rejouer</button>
        <button onClick={onReturnHome} className="btn-home">retour au menu</button>
      </div>
    </div>
  );
};

export default GameOverReproduction;