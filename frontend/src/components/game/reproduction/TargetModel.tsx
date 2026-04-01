import Board from '../Board';
import type { BrickObj } from '../Board';
import '../../CSS/TargetModel.css';

interface TargetModelProps {
  targetBricks: BrickObj[];
  rows: number;
  cols: number;
}

const TargetModel = ({ targetBricks, rows, cols }: TargetModelProps) => {
  return (
    <div className="reproduction-target-container">
      <div className="reproduction-target-wrapper">
        <div className="reproduction-target-header">
          <span className="reproduction-target-pip" />
          <h4 className="reproduction-target-title">modèle à reproduire</h4>
          <span className="reproduction-target-pip" />
        </div>
        <div className="reproduction-target-board">
          <Board
            rows={rows}
            cols={cols}
            bricks={targetBricks}
            cellSize={28}
          />
        </div>
      </div>
    </div>
  );
};

export default TargetModel;