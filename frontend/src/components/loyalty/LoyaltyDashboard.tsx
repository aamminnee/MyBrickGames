import { useState, useEffect } from 'react';
import '../CSS/LoyaltyDashboard.css';

const LoyaltyDashboard = () => {
  // on utilise le localstorage pour se souvenir de l'id du joueur entre les parties
  const [loyaltyId, setLoyaltyId] = useState(() => localStorage.getItem('loyaltyId') || 'joueur_test_123');
  const [points, setPoints] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);
  const [consumeAmount, setConsumeAmount] = useState<number>(10);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // met a jour l'identifiant dans le cache local
  const handleIdChange = (newId: string) => {
    setLoyaltyId(newId);
    localStorage.setItem('loyaltyId', newId);
  };

  // recupere les points valides
  const fetchPoints = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/player/${loyaltyId}/points`);
      const data = await res.json();
      if (data.points !== undefined) setPoints(data.points);
    } catch (err) {
      console.error("erreur lors de la recuperation des points :", err);
    }
  };

  // recupere l'historique des parties
  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/player/${loyaltyId}/history`);
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } catch (err) {
      console.error("erreur lors de la recuperation de l'historique :", err);
    }
  };

  // actualise l'affichage
  const handleRefresh = () => {
    fetchPoints();
    fetchHistory();
    setMessage(null);
  };

  // simule le site php qui consomme des points pour un bon de reduction
  const handleConsume = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/player/${loyaltyId}/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointsToConsume: consumeAmount })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `succès : ${consumeAmount} points consommés pour un bon de réduction !`, type: 'success' });
        fetchPoints();
      } else {
        setMessage({ text: `erreur : ${data.error}`, type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'erreur de connexion au backend', type: 'error' });
    }
  };

  // charge les donnees au demarrage et quand l'id change
  useEffect(() => {
    handleRefresh();
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

        {message && (
          <div className={`loyalty-message ${message.type === 'error' ? 'loyalty-message-error' : ''}`}>
            {message.text}
          </div>
        )}

        <div className="loyalty-actions">
          <input 
            type="number" 
            className="lego-input" 
            style={{ width: '100px' }}
            value={consumeAmount} 
            onChange={(e) => setConsumeAmount(Number(e.target.value))}
            min="1"
          />
          <button className="btn-lego btn-green" onClick={handleConsume}>
            💳 tester un bon de réduction
          </button>
          <button className="btn-lego btn-blue" onClick={handleRefresh}>
            🔄 rafraîchir
          </button>
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