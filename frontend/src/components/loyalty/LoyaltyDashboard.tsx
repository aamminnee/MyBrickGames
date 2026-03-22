import { useState, useEffect, useMemo } from 'react';
import '../CSS/LoyaltyDashboard.css';

const LoyaltyDashboard = () => {
  // etat pour l'id utilisateur et les donnees du backend
  const [loyaltyId, setLoyaltyId] = useState(() => localStorage.getItem('loyalty_id') || 'joueur_test_123');
  const [points, setPoints] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [history, setHistory] = useState<any[]>([]);

  // etat pour les filtres dynamiques
  const [filterGame, setFilterGame] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<string>('all');

  // etat pour l'onglet de categorie des succes
  const [achievTab, setAchievTab] = useState<'tetris' | 'reproduction' | 'multi' | 'other'>('tetris');

  // mettre a jour l'identifiant dans le cache local
  const handleIdChange = (newId: string) => {
    setLoyaltyId(newId);
    localStorage.setItem('loyalty_id', newId);
  };

  // recuperer les donnees au montage ou au changement d'id
  useEffect(() => {
    const fetchData = async () => {
      try {
        // recuperer les points
        const pointsRes = await fetch(`http://localhost:3000/api/player/${loyaltyId}/points`, { cache: 'no-store' });
        const pointsData = await pointsRes.json();
        if (pointsData.points !== undefined) setPoints(pointsData.points);

        // recuperer l'historique
        const historyRes = await fetch(`http://localhost:3000/api/player/${loyaltyId}/history`, { cache: 'no-store' });
        const historyData = await historyRes.json();
        if (Array.isArray(historyData)) setHistory(historyData);
      } catch (err) {
        console.error("erreur lors de la recuperation des donnees:", err);
      }
    };

    fetchData();
  }, [loyaltyId]);

  // calculer l'historique filtre en fonction des filtres selectionnes
  const filteredHistory = useMemo(() => {
    return history.filter(game => {
      const matchGame = filterGame === 'all' || game.gameId === filterGame;
      const matchMode = filterMode === 'all' || game.mode === filterMode;
      return matchGame && matchMode;
    });
  }, [history, filterGame, filterMode]);

  // calculer les statistiques dynamiques basees sur l'historique filtre
  const stats = useMemo(() => {
    const total = filteredHistory.length;
    const wins = filteredHistory.filter(g => g.result === 'win').length;
    const losses = filteredHistory.filter(g => g.result === 'loss').length;
    const draws = filteredHistory.filter(g => g.result === 'draw').length;
    
    // le ratio de victoire est base uniquement sur les parties decisives (victoires + defaites)
    const decisiveGames = wins + losses;
    const winRatio = decisiveGames > 0 ? ((wins / decisiveGames) * 100).toFixed(1) : "0.0";
    
    // meilleur score dans la selection filtree
    const bestScore = total > 0 ? Math.max(...filteredHistory.map(g => g.score)) : 0;

    return { total, wins, losses, draws, winRatio, bestScore };
  }, [filteredHistory]);

  // definitions et calculs des succes
  const achievementsList = useMemo(() => {
    // fonctions utilitaires pour calculer la progression
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countGames = (filterFn: (g: any) => boolean) => history.filter(filterFn).length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maxScore = (filterFn: (g: any) => boolean) => {
      const scores = history.filter(filterFn).map(g => g.score);
      return scores.length > 0 ? Math.max(...scores) : 0;
    };
    const totalPointsEarned = history.reduce((sum, g) => sum + g.pointsEarned, 0);

    const list = [
      // succes tetris (10)
      { id: 't1', cat: 'tetris', title: 'novice tetris', objective: 'jouer 1 partie', icon: '🧱', target: 1, current: countGames(g => g.gameId === 'tetris') },
      { id: 't2', cat: 'tetris', title: 'amateur tetris', objective: 'jouer 10 parties', icon: '🕹️', target: 10, current: countGames(g => g.gameId === 'tetris') },
      { id: 't3', cat: 'tetris', title: 'pro tetris', objective: 'jouer 50 parties', icon: '🔥', target: 50, current: countGames(g => g.gameId === 'tetris') },
      { id: 't4', cat: 'tetris', title: 'premier pas', objective: 'score de 100', icon: '🌟', target: 100, current: maxScore(g => g.gameId === 'tetris') },
      { id: 't5', cat: 'tetris', title: 'bon joueur', objective: 'score de 500', icon: '🚀', target: 500, current: maxScore(g => g.gameId === 'tetris') },
      { id: 't6', cat: 'tetris', title: 'maître tetris', objective: 'score de 1000', icon: '👑', target: 1000, current: maxScore(g => g.gameId === 'tetris') },
      { id: 't7', cat: 'tetris', title: 'légende tetris', objective: 'score de 5000', icon: '💎', target: 5000, current: maxScore(g => g.gameId === 'tetris') },
      { id: 't8', cat: 'tetris', title: 'victoire solo', objective: 'gagner 1 fois', icon: '🥇', target: 1, current: countGames(g => g.gameId === 'tetris' && g.mode === 'solo' && g.result === 'win') },
      { id: 't9', cat: 'tetris', title: 'champion solo', objective: 'gagner 10 fois', icon: '🏆', target: 10, current: countGames(g => g.gameId === 'tetris' && g.mode === 'solo' && g.result === 'win') },
      { id: 't10', cat: 'tetris', title: 'vétéran tetris', objective: 'jouer 100 parties', icon: '👻', target: 100, current: countGames(g => g.gameId === 'tetris') },

      // succes reproduction (10)
      { id: 'r1', cat: 'reproduction', title: 'apprenti bâtisseur', objective: 'jouer 1 partie', icon: '🖼️', target: 1, current: countGames(g => g.gameId === 'reproduction') },
      { id: 'r2', cat: 'reproduction', title: 'constructeur', objective: 'jouer 10 parties', icon: '🏗️', target: 10, current: countGames(g => g.gameId === 'reproduction') },
      { id: 'r3', cat: 'reproduction', title: 'architecte', objective: 'jouer 50 parties', icon: '🏛️', target: 50, current: countGames(g => g.gameId === 'reproduction') },
      { id: 'r4', cat: 'reproduction', title: 'précision 50%', objective: 'atteindre 50% de précision', icon: '📏', target: 50, current: maxScore(g => g.gameId === 'reproduction') },
      { id: 'r5', cat: 'reproduction', title: 'précision 80%', objective: 'atteindre 80% de précision', icon: '🎯', target: 80, current: maxScore(g => g.gameId === 'reproduction') },
      { id: 'r6', cat: 'reproduction', title: 'perfectionniste', objective: '100% de précision', icon: '✨', target: 100, current: maxScore(g => g.gameId === 'reproduction') },
      { id: 'r7', cat: 'reproduction', title: 'maître bâtisseur', objective: '5 fois 100% de précision', icon: '🎨', target: 5, current: countGames(g => g.gameId === 'reproduction' && g.score === 100) },
      { id: 'r8', cat: 'reproduction', title: 'victoire repro', objective: 'gagner 1 fois', icon: '🏅', target: 1, current: countGames(g => g.gameId === 'reproduction' && g.mode === 'solo' && g.result === 'win') },
      { id: 'r9', cat: 'reproduction', title: 'champion repro', objective: 'gagner 10 fois', icon: '🥇', target: 10, current: countGames(g => g.gameId === 'reproduction' && g.mode === 'solo' && g.result === 'win') },
      { id: 'r10', cat: 'reproduction', title: 'bâtisseur fou', objective: 'jouer 100 parties', icon: '🤪', target: 100, current: countGames(g => g.gameId === 'reproduction') },

      // succes multijoueur (10)
      { id: 'm1', cat: 'multi', title: 'sociable', objective: 'jouer 1 partie en multi', icon: '🤝', target: 1, current: countGames(g => g.mode === 'multi') },
      { id: 'm2', cat: 'multi', title: 'compétiteur', objective: 'jouer 10 parties multi', icon: '⚔️', target: 10, current: countGames(g => g.mode === 'multi') },
      { id: 'm3', cat: 'multi', title: 'gladiateur', objective: 'jouer 50 parties multi', icon: '🛡️', target: 50, current: countGames(g => g.mode === 'multi') },
      { id: 'm4', cat: 'multi', title: 'première victoire', objective: 'gagner 1 fois en multi', icon: '🎉', target: 1, current: countGames(g => g.mode === 'multi' && g.result === 'win') },
      { id: 'm5', cat: 'multi', title: 'habitué du podium', objective: 'gagner 10 fois en multi', icon: '🥉', target: 10, current: countGames(g => g.mode === 'multi' && g.result === 'win') },
      { id: 'm6', cat: 'multi', title: 'invincible', objective: 'gagner 50 fois en multi', icon: '🦸', target: 50, current: countGames(g => g.mode === 'multi' && g.result === 'win') },
      { id: 'm7', cat: 'multi', title: 'duel tetris', objective: 'gagner 5 fois sur tetris', icon: '🥊', target: 5, current: countGames(g => g.mode === 'multi' && g.gameId === 'tetris' && g.result === 'win') },
      { id: 'm8', cat: 'multi', title: 'duel repro', objective: 'gagner 5 fois sur reproduction', icon: '🧩', target: 5, current: countGames(g => g.mode === 'multi' && g.gameId === 'reproduction' && g.result === 'win') },
      { id: 'm9', cat: 'multi', title: 'pacifiste', objective: 'faire 5 matchs nuls', icon: '☮️', target: 5, current: countGames(g => g.mode === 'multi' && g.result === 'draw') },
      { id: 'm10', cat: 'multi', title: 'roi de l\'arène', objective: 'jouer 100 parties en multi', icon: '👑', target: 100, current: countGames(g => g.mode === 'multi') },

      // autres succes (10)
      { id: 'o1', cat: 'other', title: 'nouveau venu', objective: 'jouer 1 partie', icon: '👋', target: 1, current: history.length },
      { id: 'o2', cat: 'other', title: 'accro', objective: 'jouer 50 parties', icon: '👀', target: 50, current: history.length },
      { id: 'o3', cat: 'other', title: 'sans limite', objective: 'jouer 100 parties', icon: '🌌', target: 100, current: history.length },
      { id: 'o4', cat: 'other', title: 'collectionneur', objective: 'gagner 1000 points', icon: '🪙', target: 1000, current: totalPointsEarned },
      { id: 'o5', cat: 'other', title: 'riche', objective: 'gagner 5000 points', icon: '💰', target: 5000, current: totalPointsEarned },
      { id: 'o6', cat: 'other', title: 'millionnaire', objective: 'gagner 10000 points', icon: '🏦', target: 10000, current: totalPointsEarned },
      { id: 'o7', cat: 'other', title: 'on apprend de ses erreurs', objective: 'perdre 10 fois', icon: '📉', target: 10, current: countGames(g => g.result === 'loss') },
      { id: 'o8', cat: 'other', title: 'increvable', objective: 'perdre 50 fois', icon: '🧟', target: 50, current: countGames(g => g.result === 'loss') },
      { id: 'o9', cat: 'other', title: 'gagnant sérieux', objective: 'gagner 50 fois', icon: '😎', target: 50, current: countGames(g => g.result === 'win') },
      { id: 'o10', cat: 'other', title: 'légende vivante', objective: 'gagner 100 fois', icon: '🌟', target: 100, current: countGames(g => g.result === 'win') },
    ];

    // plafonner la progression actuelle a la cible pour ne pas depasser 100%
    return list.map(item => ({
      ...item,
      current: Math.min(item.current, item.target)
    }));
  }, [history]);

  // calculs pour la progression globale
  const totalAchievements = achievementsList.length;
  const totalCompleted = achievementsList.filter(a => a.current >= a.target).length;
  const globalPercentage = totalAchievements > 0 ? (totalCompleted / totalAchievements) * 100 : 0;

  // filtrer les succes par onglet actif
  const activeAchievements = achievementsList.filter(a => a.cat === achievTab);

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
        <h3 className="loyalty-title">mes statistiques & historique</h3>
        
        {/* barre de filtres */}
        <div className="filters-bar">
          <div className="filter-group">
            <label>jeu :</label>
            <select value={filterGame} onChange={(e) => setFilterGame(e.target.value)}>
              <option value="all">tous les jeux</option>
              <option value="reproduction">reproduction</option>
              <option value="tetris">casse-briques (tetris)</option>
            </select>
          </div>
          <div className="filter-group">
            <label>mode :</label>
            <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
              <option value="all">tous les modes</option>
              <option value="solo">solo</option>
              <option value="multi">multijoueur</option>
            </select>
          </div>
        </div>

        {/* grille de statistiques dynamiques */}
        <div className="stats-grid">
          <div className="stat-card highlight-card">
            <h4>ratio de victoire</h4>
            <div className="value win">{stats.winRatio}%</div>
            <small>sur {stats.wins + stats.losses} parties décisives</small>
          </div>

          <div className="stat-card">
            <h4>parties jouées</h4>
            <div className="value" style={{ color: 'var(--text-dark)' }}>{stats.total}</div>
            <small className="win-loss-text">
              <span className="text-win">{stats.wins} V</span> / <span className="text-loss">{stats.losses} D</span>
              {stats.draws > 0 && ` / ${stats.draws} N`}
            </small>
          </div>

          <div className="stat-card">
            <h4>meilleur score (record)</h4>
            <div className="value" style={{ color: 'var(--lego-red)' }}>{stats.bestScore}</div>
            <small>sur la sélection actuelle</small>
          </div>
        </div>

        <hr style={{ margin: '30px 0', borderColor: '#e2e8f0' }} />

        {/* liste de l'historique filtre */}
        <h4 style={{ color: 'var(--text-grey)', marginBottom: '15px' }}>
          historique filtré ({stats.total} résultats)
        </h4>
        
        {filteredHistory.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-grey)' }}>aucune partie ne correspond à ces filtres.</p>
        ) : (
          <ul className="loyalty-history-list">
            {filteredHistory.map((game, idx) => (
              <li key={idx} className="loyalty-history-item">
                <div>
                  <strong>{game.gameId === 'tetris' ? 'casse-briques' : 'reproduction'}</strong>
                  <span style={{ marginLeft: '10px', fontSize: '0.8rem', padding: '3px 8px', borderRadius: '10px', background: '#e2e8f0' }}>
                    {game.mode}
                  </span>
                  <br/>
                  <small style={{ color: 'var(--text-grey)' }}>{new Date(game.playedAt).toLocaleString()}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  score : {game.score} 
                  <span style={{ fontSize: '0.8rem', marginLeft: '5px' }}>
                    ({game.result === 'win' ? 'victoire 🏆' : game.result === 'loss' ? 'défaite ❌' : 'égalité 🤝'})
                  </span>
                  <br/>
                  <span style={{ color: 'var(--lego-red)', fontWeight: 'bold' }}>+{game.pointsEarned} pts gagnés</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* section des succes */}
      <div className="loyalty-card">
        <h3 className="loyalty-title">succès & trophées</h3>

        {/* barre de progression globale */}
        <div className="global-progress-container">
          <div className="global-progress-info">
            <span className="global-progress-title">progression globale des succès</span>
            <span className="global-progress-stats">
              {totalCompleted} / {totalAchievements} trophées ({Math.round(globalPercentage)}%)
            </span>
          </div>
          <div className="achiev-progress-bar">
            <div 
              className="achiev-progress-fill global-fill" 
              style={{ width: `${globalPercentage}%` }}
            ></div>
          </div>
        </div>
        
        {/* onglets de categories */}
        <div className="achiev-tabs">
          <button 
            className={`achiev-tab ${achievTab === 'tetris' ? 'active' : ''}`}
            onClick={() => setAchievTab('tetris')}
          >
            🧱 casse-briques
          </button>
          <button 
            className={`achiev-tab ${achievTab === 'reproduction' ? 'active' : ''}`}
            onClick={() => setAchievTab('reproduction')}
          >
            🖼️ reproduction
          </button>
          <button 
            className={`achiev-tab ${achievTab === 'multi' ? 'active' : ''}`}
            onClick={() => setAchievTab('multi')}
          >
            ⚔️ multijoueur
          </button>
          <button 
            className={`achiev-tab ${achievTab === 'other' ? 'active' : ''}`}
            onClick={() => setAchievTab('other')}
          >
            🌟 autres
          </button>
        </div>

        {/* grille de succes style mybrickgames */}
        <div className="achiev-grid">
          {activeAchievements.map(achiev => {
            const percentage = (achiev.current / achiev.target) * 100;
            const isCompleted = achiev.current >= achiev.target;

            return (
              <div key={achiev.id} className={`achiev-card ${isCompleted ? 'completed' : ''}`}>
                <div className="achiev-icon-wrapper">
                  {achiev.icon}
                </div>
                <div className="achiev-info">
                  <h4 className="achiev-title">{achiev.title}</h4>
                  <p className="achiev-objective">{achiev.objective}</p>
                  
                  <div className="achiev-progress-container">
                    <div className="achiev-progress-bar">
                      {/* remplissage dynamique visuel */}
                      <div 
                        className="achiev-progress-fill" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    {/* texte dynamique de progression */}
                    <span className="achiev-progress-text">
                      {Math.round(achiev.current)} / {achiev.target} ({Math.round(percentage)}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default LoyaltyDashboard;