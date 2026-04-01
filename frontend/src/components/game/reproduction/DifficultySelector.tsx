export type Difficulty = 'easy' | 'normal' | 'hard';
import '../../CSS/DifficultySelector.css';

interface DifficultySelectorProps {
  onSelect: (diff: Difficulty) => void;
}

const LEVELS: { diff: Difficulty; label: string; sub: string; grid: string; mod: string }[] = [
  { diff: 'easy',   label: 'FACILE',    sub: 'pour débuter',    grid: '8 × 8',  mod: 'diff-easy'   },
  { diff: 'normal', label: 'MOYEN',     sub: 'le défi standard', grid: '10 × 10', mod: 'diff-normal' },
  { diff: 'hard',   label: 'DIFFICILE', sub: 'pour les pros',   grid: '12 × 12', mod: 'diff-hard'   },
];

const DifficultySelector = ({ onSelect }: DifficultySelectorProps) => {
  return (
    <div className="reproduction-diff-container">
      <div className="reproduction-diff-header">
        <span className="reproduction-diff-bar" />
        <h2 className="reproduction-diff-title">MODE REPRODUCTION</h2>
        <span className="reproduction-diff-bar" />
      </div>
      <p className="reproduction-diff-subtitle">choisis ta difficulté</p>

      <div className="reproduction-diff-buttons">
        {LEVELS.map(({ diff, label, sub, grid, mod }) => (
          <button
            key={diff}
            className={`diff-btn ${mod}`}
            onClick={() => onSelect(diff)}
          >
            <span className="diff-btn-label">{label}</span>
            <span className="diff-btn-grid">{grid}</span>
            <span className="diff-btn-sub">{sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DifficultySelector;