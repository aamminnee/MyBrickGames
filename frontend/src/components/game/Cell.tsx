import './Cell.css';

interface CellProps {
  color: string | null;
  onClick?: () => void; 
}

const Cell = ({ color, onClick }: CellProps) => {
  const cursorClass = onClick ? 'cell-pointer' : 'cell-default';
  
  return (
    <div 
      onClick={onClick}
      className={`cell-box ${cursorClass}`}
      style={{
        backgroundColor: color || '#e0e0e0',
        boxShadow: color ? 'inset 0 0 5px rgba(0,0,0,0.3)' : 'none',
      }}
    />
  );
};

export default Cell;