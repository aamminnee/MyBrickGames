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
  onCellClick?: (r: number, c: number) => void;
  cellSize?: number;
}

const Board = ({ rows, cols, bricks = [], onCellClick, cellSize = 25 }: BoardProps) => {
  return (
    <div style={{
      display: 'inline-grid', 
      gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
      gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
      background: '#ffffff',
      border: '2px solid #333',
      margin: '0 auto',
      position: 'relative',
      width: 'max-content', 
      boxSizing: 'content-box'
    }}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <div
            key={`cell-${r}-${c}`}
            onClick={() => onCellClick && onCellClick(r, c)}
            style={{
              gridColumn: c + 1,
              gridRow: r + 1,
              border: '1px solid rgba(0,0,0,0.05)',
              cursor: onCellClick ? 'pointer' : 'default'
            }}
          />
        ))
      )}

      {bricks.map((brick, i) => (
        <div
          key={`brick-${i}`}
          style={{
            gridColumn: `${brick.x + 1} / span ${brick.w}`,
            gridRow: `${brick.y + 1} / span ${brick.h}`,
            backgroundColor: brick.color,
            border: '1px solid rgba(0,0,0,0.5)', 
            boxSizing: 'border-box',
            pointerEvents: 'none', 
            zIndex: 10
          }}
        />
      ))}
    </div>
  );
};

export default Board;