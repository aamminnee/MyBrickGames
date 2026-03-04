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
      <h4 className="reproduction-active-title">pioche la brique et dépose-la :</h4>
      
      <div className="reproduction-active-box">
        <DraggableBrick 
          disabled={!currentBrick}
          rows={currentBrick?.h || 1}
          cols={currentBrick?.w || 1}
          bricks={currentBrick ? [{x:0, y:0, w: currentBrick.w, h: currentBrick.h, color: currentBrick.color}] : []}
          cellSize={30}
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', 'brique');
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={onDragEnd}
        />
      </div>
    </div>
  );
};

export default ActiveBrick;
