interface CellProps {
  color: string | null;
  onClick?: () => void; 
}

const Cell = ({ color, onClick }: CellProps) => {
  return (
    <div 
      onClick={onClick}
      style={{
        width: '100%',
        paddingBottom: '100%',
        backgroundColor: color || '#e0e0e0',
        border: '1px solid #ccc',
        boxSizing: 'border-box',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: color ? 'inset 0 0 5px rgba(0,0,0,0.3)' : 'none',
      }}
    />
  );
};

export default Cell;