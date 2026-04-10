import '../../CSS/OpponentView.css';
import Board from '../Board';
import { gridToBricks } from '../../../utils/gameUtils';

interface OpponentViewProps {
  score: number;
  board: (string | null)[][];
  rows: number;
  cols: number;
}

const OpponentView = ({ score, board, rows, cols }: OpponentViewProps) => {
  return (
    <div className="tetris-opponent">
      <h3 className="tetris-opponent-title">adversaire ⚔️</h3>
      <div className="tetris-opponent-score">
        score : {score}
      </div>

      <div className="tetris-opponent-label">grille :</div>
      <Board 
        rows={rows}
        cols={cols}
        bricks={gridToBricks(board)}
        cellSize={15}
        gridClassName="tetris-opponent-grid-style"
      />
    </div>
  );
};

export default OpponentView;