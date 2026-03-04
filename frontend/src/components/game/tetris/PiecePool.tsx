// available pieces container
import React from 'react';
import '../../CSS/PiecePool.css'; 
import DraggableBrick from '../DraggableBrick';
import { shapeToBricks } from '../../../utils/gameUtils';

// shape interface
export interface Piece {
  shape: number[][];
  color: string;
}

// pool properties
interface PiecePoolProps {
  availablePieces: (Piece | null)[];
  isDragging: boolean;
  draggingIndex: number | null;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onRotate: (index: number, e?: React.MouseEvent) => void;
  onMouseDown: () => void;
}

const PiecePool = ({
  availablePieces,
  isDragging,
  draggingIndex,
  onDragStart,
  onDragEnd,
  onRotate,
  onMouseDown
}: PiecePoolProps) => {
  return (
    <div className="tetris-pool-container">
      <h4 className="tetris-pool-title">briques disponibles :</h4>
      <div className="tetris-pool-flex">
        {availablePieces.map((piece, idx) => (
          <div key={idx} className="tetris-pool-item">
            <DraggableBrick 
              disabled={!piece}
              rows={piece ? piece.shape.length : 1}
              cols={piece ? piece.shape[0].length : 1}
              bricks={piece ? shapeToBricks(piece.shape, piece.color) : []}
              cellSize={25}
              isDragging={isDragging && draggingIndex === idx}
              onDragStart={(e) => onDragStart(e, idx)}
              onDragEnd={onDragEnd}
              onClick={(e) => onRotate(idx, e)}
              onMouseDown={onMouseDown}
            />
          </div>
        ))}
      </div>
      <p className="tetris-pool-hint">
        cliquez pour pivoter, glissez pour placer
      </p>
    </div>
  );
};

export default PiecePool;