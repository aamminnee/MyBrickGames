import React, { useMemo } from 'react';
import '../CSS/Board.css'; 

export interface BrickObj {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

interface BoardProps {
  rows: number;
  cols: number;
  bricks: BrickObj[];
  onCellDrop?: (r: number, c: number) => void;
  onCellHover?: (r: number, c: number) => void;
  onMouseLeave?: () => void;
  previewBricks?: BrickObj[] | null;
  hoverPos?: { r: number, c: number } | null;
  cellSize?: number;
  gridClassName?: string;
}

const Board = ({ 
  rows, 
  cols, 
  bricks = [], 
  onCellDrop, 
  onCellHover,
  onMouseLeave,
  previewBricks,
  hoverPos,
  cellSize = 25,
  gridClassName
}: BoardProps) => {
  const tenonSvg = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><circle cx="15" cy="15" r="10" fill="rgba(255,255,255,0.15)" stroke="rgba(0,0,0,0.3)" stroke-width="2"/><path d="M 8 15 A 7 7 0 0 1 22 15" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"/></svg>')`;

  const gridMap = useMemo(() => {
    const map = Array.from({ length: rows }, () => Array(cols).fill(null));
    bricks.forEach(b => {
      for (let i = 0; i < b.h; i++) {
        for (let j = 0; j < b.w; j++) {
          if (b.y + i >= 0 && b.y + i < rows && b.x + j >= 0 && b.x + j < cols) {
            map[b.y + i][b.x + j] = b.color;
          }
        }
      }
    });
    return map;
  }, [rows, cols, bricks]);

  const previewMap = useMemo(() => {
    const map = Array.from({ length: rows }, () => Array(cols).fill(null));
    if (previewBricks && hoverPos) {
      previewBricks.forEach(pb => {
        for (let i = 0; i < pb.h; i++) {
          for (let j = 0; j < pb.w; j++) {
            const r = hoverPos.r + pb.y + i;
            const c = hoverPos.c + pb.x + j;
            if (r >= 0 && r < rows && c >= 0 && c < cols) {
              map[r][c] = pb.color;
            }
          }
        }
      });
    }
    return map;
  }, [rows, cols, previewBricks, hoverPos]);

  return (
    <div 
      className={`board-container ${gridClassName || ''}`}
      onMouseLeave={onMouseLeave}
      style={{
        '--grid-cols': cols,
        '--grid-rows': rows,
        '--cell-size': `${cellSize}px`
      } as React.CSSProperties}
    >
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <div
            key={`cell-${r}-${c}`}
            className="board-cell-bg"
            onDragOver={(e) => {
              e.preventDefault(); 
              if (onCellHover) onCellHover(r, c); 
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (onCellDrop) onCellDrop(r, c);
            }}
            style={{
              '--cell-col': c + 1,
              '--cell-row': r + 1,
            } as React.CSSProperties}
          />
        ))
      )}

      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const color = gridMap[r][c];
          if (!color) return null;

          const hasTop = r > 0 && gridMap[r - 1][c] === color;
          const hasBottom = r < rows - 1 && gridMap[r + 1][c] === color;
          const hasLeft = c > 0 && gridMap[r][c - 1] === color;
          const hasRight = c < cols - 1 && gridMap[r][c + 1] === color;

          return (
            <div
              key={`brick-cell-${r}-${c}`}
              className="board-brick-placed"
              style={{
                '--cell-col': c + 1,
                '--cell-row': r + 1,
                '--brick-color': color,
                '--tenon-svg': tenonSvg,
                '--cell-size': `${cellSize}px`,
                '--border-t': hasTop ? 'none' : '1px solid rgba(0,0,0,0.6)',
                '--border-b': hasBottom ? 'none' : '1px solid rgba(0,0,0,0.6)',
                '--border-l': hasLeft ? 'none' : '1px solid rgba(0,0,0,0.6)',
                '--border-r': hasRight ? 'none' : '1px solid rgba(0,0,0,0.6)',
                '--box-shadow': (!hasBottom || !hasRight) ? '2px 2px 4px rgba(0,0,0,0.3)' : 'none'
              } as React.CSSProperties}
            />
          );
        })
      )}

      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const color = previewMap[r][c];
          if (!color) return null;

          const hasTop = r > 0 && previewMap[r - 1][c] === color;
          const hasBottom = r < rows - 1 && previewMap[r + 1][c] === color;
          const hasLeft = c > 0 && previewMap[r][c - 1] === color;
          const hasRight = c < cols - 1 && previewMap[r][c + 1] === color;

          return (
            <div
              key={`preview-cell-${r}-${c}`}
              className="board-brick-preview"
              style={{
                '--cell-col': c + 1,
                '--cell-row': r + 1,
                '--brick-color': color,
                '--tenon-svg': tenonSvg,
                '--cell-size': `${cellSize}px`,
                '--border-t': hasTop ? 'none' : '2px dashed #000',
                '--border-b': hasBottom ? 'none' : '2px dashed #000',
                '--border-l': hasLeft ? 'none' : '2px dashed #000',
                '--border-r': hasRight ? 'none' : '2px dashed #000',
              } as React.CSSProperties}
            />
          );
        })
      )}
    </div>
  );
};

export default Board;