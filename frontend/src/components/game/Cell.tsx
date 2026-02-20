interface CellProps {
  color: string | null; // null = case vide (transparente ou grise), string = couleur HTML (ex: "#FF0000")
  onClick?: () => void; // Fonction déclenchée quand le joueur clique sur la case
}

const Cell = ({ color, onClick }: CellProps) => {
  return (
    <div 
      onClick={onClick}
      style={{
        width: '100%',
        paddingBottom: '100%', // Astuce CSS pour garder un carré parfait
        backgroundColor: color || '#e0e0e0', // Gris clair si vide
        border: '1px solid #ccc',
        boxSizing: 'border-box',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: color ? 'inset 0 0 5px rgba(0,0,0,0.3)' : 'none', // Petit effet de relief si coloré
      }}
    />
  );
};

export default Cell;