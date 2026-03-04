export type Difficulty = 'easy' | 'normal' | 'hard';
import '../../CSS/DifficultySelector.css'; 

interface DifficultySelectorProps {
  onSelect: (diff: Difficulty) => void;
}

const DifficultySelector = ({ onSelect }: DifficultySelectorProps) => {
  return (
    <div className="reproduction-diff-container">
      <h2 className="reproduction-diff-title">mode reproduction</h2>
      <h3 className="reproduction-diff-subtitle">choisis ta difficulté :</h3>
      <div className="reproduction-diff-buttons">
        <button className="btn-lego btn-green" onClick={() => onSelect('easy')}>facile (8x8)</button>
        <button className="btn-lego btn-blue" onClick={() => onSelect('normal')}>moyen (10x10)</button>
        <button className="btn-lego btn-red" onClick={() => onSelect('hard')}>difficile (12x12)</button>
      </div>
    </div>
  );
};

export default DifficultySelector;
