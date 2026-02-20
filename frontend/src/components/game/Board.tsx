import Cell from './Cell';

interface BoardProps {
  rows: number;
  cols: number;
  gridData: (string | null)[][]; 
  onCellClick?: (row: number, col: number) => void;
}

const Board = ({ cols, gridData, onCellClick }: BoardProps) => {
  return (
    <div 
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`, 
        gap: '2px',
        backgroundColor: '#333', 
        padding: '2px',
        border: '4px solid #333',
        borderRadius: '8px',
        maxWidth: '90vw',
        margin: '0 auto',
        width: '500px'
      }}
    >
      {gridData.map((row, rowIndex) => 
        row.map((cellColor, colIndex) => (
          <div key={`${rowIndex}-${colIndex}`} style={{ position: 'relative' }}>
             {/* Pour l'astuce du carré (paddingBottom), on doit mettre le Cell en absolute dedans */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
               <Cell 
                 color={cellColor} 
                 onClick={() => onCellClick && onCellClick(rowIndex, colIndex)} 
               />
            </div>
             {/* Un "fantôme" invisible pour donner la taille au parent */}
             <div style={{ paddingBottom: '100%' }} /> 
          </div>
        ))
      )}
    </div>
  );
};

export default Board;