import Board from '../Board';
import type { BrickObj } from '../Board';
import '../../CSS/TargetModel.css'; 

// interface pour les proprietes du modele cible
interface TargetModelProps {
  targetBricks: BrickObj[];
  rows: number;
  cols: number;
}

const TargetModel = ({ targetBricks, rows, cols }: TargetModelProps) => {
  return (
    <div className="reproduction-target-container">
      <div>
        <h4 className="reproduction-target-title">modèle à reproduire :</h4>
        {/* on encapsule le plateau dans une div non interactive pour servir de simple image */}
        <div style={{ pointerEvents: 'none', display: 'inline-block', border: '2px solid #ccc', borderRadius: '5px', overflow: 'hidden' }}>
          <Board 
            rows={rows} 
            cols={cols} 
            bricks={targetBricks} 
            cellSize={20} // taille de cellule reduite pour le modele
          />
        </div>
      </div>
    </div>
  );
};

export default TargetModel;