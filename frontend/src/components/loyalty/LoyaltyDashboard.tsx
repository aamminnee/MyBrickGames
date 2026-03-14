import { useState, useEffect } from 'react';
import '../CSS/LoyaltyDashboard.css';

const LoyaltyDashboard = () => {
  // use localstorage to remember the player id between games
  const [loyaltyId, setLoyaltyId] = useState(() => localStorage.getItem('loyalty_id') || 'joueur_test_123');
  const [points, setPoints] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);

  // update the identifier in local cache
  const handleIdChange = (newId: string) => {
    setLoyaltyId(newId);
    localStorage.setItem('loyalty_id', newId);
  };

  // load data on startup and when id changes
  useEffect(() => {
    // fetch valid points
    const fetchPoints = async () => {
      try {
        // the option "cache: 'no-store'" forces the browser to fetch the freshest data from the server
        const res = await fetch(`http://localhost:3000/api/player/${loyaltyId}/points`, {
          cache: 'no-store' 
        });
        const data = await res.json();
        if (data.points !== undefined) setPoints(data.points);
      } catch (err) {
        console.error("error while fetching points:", err);
      }
    };

    // fetch game history
    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/player/${loyaltyId}/history`, {
          cache: 'no-store'
        });
        const data = await res.json();
        if (Array.isArray(data)) setHistory(data);
      } catch (err) {
        console.error("error while fetching history:", err);
      }
    };

    fetchPoints();
    fetchHistory();
  }, [loyaltyId]);

  return (
    <div className="loyalty-container">
      <div className="loyalty-card">
        <h2 className="loyalty-title">mon programme de fidélité</h2>
        
        <div className="loyalty-input-group">
          <label>identifiant de joueur :</label>
          <input 
            type="text" 
            className="lego-input" 
            value={loyaltyId} 
            onChange={(e) => handleIdChange(e.target.value)}
          />
        </div>

        <div className="loyalty-stats">
          <div className="loyalty-stat-box">
            <p>points disponibles</p>
            <span className="loyalty-stat-value">{points}</span>
          </div>
        </div>
      </div>

      <div className="loyalty-card">
        <h3 className="loyalty-title">historique des parties</h3>
        {history.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-grey)' }}>aucune partie jouée pour le moment.</p>
        ) : (
          <ul className="loyalty-history-list">
            {history.map((game, idx) => (
              <li key={idx} className="loyalty-history-item">
                <div>
                  <strong>{game.gameId === 'tetris' ? 'casse-briques' : 'reproduction de mosaïque'}</strong>
                  <br/>
                  <small style={{ color: 'var(--text-grey)' }}>{new Date(game.playedAt).toLocaleString()}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  score : {game.score} <br/>
                  <span style={{ color: 'var(--lego-red)', fontWeight: 'bold' }}>+{game.pointsEarned} pts gagnés</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LoyaltyDashboard;