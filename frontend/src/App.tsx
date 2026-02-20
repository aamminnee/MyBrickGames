import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import GameReproduction from './pages/GameReproduction';

const socket = io('http://localhost:3000');

const Matchmaking = () => {
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [status, setStatus] = useState<string>('En attente de connexion...');

  useEffect(() => {
    socket.on('room_created', (code) => {
      setRoomCode(code);
      setStatus(`Salon créé ! Partagez le code : ${code}`);
    });

    socket.on('game_started', (message) => {
      setStatus(`🚀 ${message}`);
    });

    socket.on('room_error', (errorMsg) => {
      alert(errorMsg);
    });

    return () => {
      socket.off('room_created');
      socket.off('game_started');
      socket.off('room_error');
    };
  }, []);

  return (
    <div style={{ background: '#f0f2f5', padding: '20px', borderRadius: '10px', marginTop: '20px', display: 'inline-block', textAlign: 'left' }}>
      <h3>Mode Duplicate (2 Joueurs) 🆚</h3>
      <p style={{ fontWeight: 'bold', color: '#D92328' }}>Statut : {status}</p>
      
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        {/* Panneau Joueur 1 */}
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h4>Joueur 1 (Hôte)</h4>
          <button onClick={() => socket.emit('create_room')} style={{ padding: '8px 15px', cursor: 'pointer' }}>
            Créer un salon
          </button>
          {roomCode && <h2 style={{ letterSpacing: '3px' }}>{roomCode}</h2>}
        </div>

        {/* Panneau Joueur 2 */}
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h4>Joueur 2 (Invité)</h4>
          <input 
            type="text" 
            placeholder="Code (ex: ABCD)" 
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={4}
            style={{ padding: '8px', width: '100px', marginRight: '10px', textTransform: 'uppercase' }}
          />
          <button 
            onClick={() => socket.emit('join_room', joinCode)} 
            style={{ padding: '8px 15px', cursor: 'pointer' }}
          >
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
};

const Home = () => (
  <div style={{ textAlign: 'center', marginTop: '50px' }}>
    <h1>Bienvenue sur MyBrickGames 🧱</h1>
    <p>Jouez, gagnez des points de fidélité, et utilisez-les sur notre boutique !</p>
    
    <Matchmaking /> {/* On intègre notre nouveau composant ici */}

    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px' }}>
        <Link to="/game/reproduction"><button style={{ padding: '10px 20px', cursor: 'pointer' }}>Jeu 1: Reproduction (Solo)</button></Link>
        <Link to="/game/tetris"><button style={{ padding: '10px 20px', cursor: 'pointer' }}>Jeu 2: Casse-briques (Solo)</button></Link>
    </div>
  </div>
);

const Profile = () => {
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fakeLoyaltyId = "CLIENT-TEST-123";

  useEffect(() => {
    fetch(`http://localhost:3000/api/player/${fakeLoyaltyId}`)
      .then((response) => {
        if (!response.ok) throw new Error("Erreur réseau");
        return response.json();
      })
      .then((data) => {
        setPoints(data.points); 
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur:", err);
        setError("Impossible de récupérer les points.");
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Mon Profil & Mes Points 🏆</h2>
      
      {/* Affichage conditionnel selon l'état du chargement */}
      {loading && <p>Chargement du solde...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <div style={{ background: '#f4f4f4', padding: '20px', borderRadius: '8px', display: 'inline-block', marginTop: '15px' }}>
          <p style={{ margin: 0, fontSize: '1.2rem' }}>Joueur : <strong>{fakeLoyaltyId}</strong></p>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#D92328', margin: '10px 0 0 0' }}>
            {points} point(s)
          </p>
        </div>
      )}
    </div>
  );
};

const GameTetris = () => <h2 style={{ textAlign: 'center' }}>Jeu 2 : Casse-briques 🧱 (Bientôt)</h2>;

function App() {
  return (
    <Router>
      {/* Barre de navigation basique */}
      <nav style={{ padding: '15px', background: '#D92328', color: 'white', display: 'flex', gap: '20px' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Accueil</Link>
        <Link to="/profile" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Profil Fidélité</Link>
      </nav>

      {/* Zone où les pages s'affichent */}
      <div style={{ padding: '20px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/game/reproduction" element={<GameReproduction />} />
          <Route path="/game/tetris" element={<GameTetris />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;