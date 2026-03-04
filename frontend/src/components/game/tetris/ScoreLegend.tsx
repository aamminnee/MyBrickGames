// score legend component
import '../../CSS/ScoreLegend.css'

// interface for score config
interface ScoreLegendProps {
  colorConfig: Record<string, { weight: number; points: number; name: string }>;
}

const ScoreLegend = ({ colorConfig }: ScoreLegendProps) => {
  return (
    <div className="tetris-legend">
      <h4 className="tetris-legend-title">barème des points (par ligne) :</h4>
      <ul className="tetris-legend-list">
        {Object.entries(colorConfig).map(([color, config]) => (
          <li key={color} className="tetris-legend-item">
            {/* inline style used here only because color is dynamically data-driven */}
            <span className="tetris-legend-color" style={{ backgroundColor: color }}></span>
            <strong>{config.name}</strong> : {config.points} pts
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ScoreLegend;