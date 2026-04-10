import React from 'react';
import Board from './Board';
import type { BrickObj } from './Board';
import '../CSS/DraggableBrick.css';

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
  if (disabled) {
    return (
      <div className="draggable-brick-wrapper draggable-brick-disabled">
        placé
      </div>
    );
  }

  const dragClass = isDragging ? 'draggable-brick-dragging' : 'draggable-brick-active';

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