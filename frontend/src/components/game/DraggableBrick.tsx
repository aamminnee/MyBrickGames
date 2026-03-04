import React from 'react';
import Board from './Board';
import type { BrickObj } from './Board';
import '../CSS/DraggableBrick.css'; // import du css

// interface pour les proprietes de la brique deplacable
interface DraggableBrickProps {
  rows: number;
  cols: number;
  bricks: BrickObj[];
  cellSize?: number;
  isDragging?: boolean;
  disabled?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

// composant qui affiche une brique jouable
const DraggableBrick = ({
  rows,
  cols,
  bricks,
  cellSize = 25,
  isDragging = false,
  disabled = false,
  onDragStart,
  onDragEnd,
  onClick,
  onMouseDown
}: DraggableBrickProps) => {
  // si la piece est deja placee
  if (disabled) {
    return (
      <div className="draggable-brick-wrapper draggable-brick-disabled">
        placé
      </div>
    );
  }

  const dragClass = isDragging ? 'draggable-brick-dragging' : 'draggable-brick-active';

  // affiche la piece deplacable
  return (
    <div className="draggable-brick-wrapper">
      <div
        className={dragClass}
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onClick}
        onMouseDown={onMouseDown}
      >
        <Board
          rows={rows}
          cols={cols}
          bricks={bricks}
          cellSize={cellSize}
        />
      </div>
    </div>
  );
};

export default DraggableBrick;