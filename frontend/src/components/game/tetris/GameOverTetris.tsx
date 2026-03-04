// game over component for tetris
import '../../CSS/GameOverTetris.css';

// interface for props
interface GameOverTetrisProps {
  score: number;
  onReplay: () => void;
}

const GameOverTetris = ({ score, onReplay }: GameOverTetrisProps) => {
  return (
    <div className="tetris-gameover">
      <h2 className="tetris-gameover-title">partie terminée !</h2>
      <p className="tetris-gameover-text">plus aucun bloc ne peut être placé.</p>
      <p className="tetris-gameover-text">votre score final est de : <strong>{score}</strong> points</p>
      <button 
        className="btn-lego btn-blue tetris-gameover-btn" 
        onClick={onReplay}
      >
        rejouer
      </button>
    </div>
  );
};

export default GameOverTetris;