import DraggableBrick from '../DraggableBrick';
import type { BrickObj } from '../Board';
import '../../CSS/ActiveBrick.css';

interface ActiveBrickProps {
  currentBrick: Omit<BrickObj, 'x' | 'y'> | null;
  onDragEnd: () => void;
}

const ActiveBrick = ({ currentBrick, onDragEnd }: ActiveBrickProps) => {
  return (
    <div className="reproduction-active-brick">
      <div className="reproduction-active-header">
        <span className="reproduction-active-dot" />
        <p className="reproduction-active-title">brique active</p>
      </div>
      <p className="reproduction-active-hint">glisse et dépose sur la grille</p>
      <div className="reproduction-active-box">
        <DraggableBrick
          disabled={!currentBrick}
          rows={currentBrick?.h || 1}
          cols={currentBrick?.w || 1}
          bricks={
            currentBrick
              ? [{ x: 0, y: 0, w: currentBrick.w, h: currentBrick.h, color: currentBrick.color }]
              : []
          }
          cellSize={40}
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', 'brique');
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={onDragEnd}
        />
      </div>
      {!currentBrick && (
        <p className="reproduction-active-empty">— en attente —</p>
      )}
    </div>
  );
};

export default ActiveBrick;