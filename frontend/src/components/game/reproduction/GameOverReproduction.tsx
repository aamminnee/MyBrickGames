interface GameOverReproductionProps {
  score: number;
  totalCells: number;
  onReplay: () => void;
}
import '../../CSS/GameOverReproduction.css';

const GameOverReproduction = ({ score, totalCells, onReplay }: GameOverReproductionProps) => {
  // calculate accuracy percentage
  const percentage = Math.round((score / totalCells) * 100);

  return (
    <div className="reproduction-gameover-panel">
      <h2 className="reproduction-gameover-title">terminé !</h2>
      <p className="reproduction-gameover-text">précision : <strong>{percentage}%</strong></p>
      <button 
        className="btn-lego btn-blue reproduction-gameover-btn" 
        onClick={onReplay}
      >
        rejouer
      </button>
    </div>
  );
};

export default GameOverReproduction;