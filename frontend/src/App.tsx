import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import GameReproduction from './pages/GameReproduction';
import ChatBox from './components/chat/ChatBox';
import './App.css'; 

const socket = io('http://localhost:3000');

const MultiplayerHub = () => {
  const [screen, setScreen] = useState<'home' | 'lobby' | 'playing'>('home');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [guestArrived, setGuestArrived] = useState(false);
  const [selectedGame, setSelectedGame] = useState('reproduction');
  const [gameData, setGameData] = useState<any>(null);

  useEffect(() => {
    socket.on('room_created', (code) => {
      setRoomCode(code);
      setIsHost(true);
      setScreen('lobby');
    });

    socket.on('player_joined', () => setGuestArrived(true));

    socket.on('game_started', (data) => {
      setGameData(data.levelData);
      setScreen('playing');
    });

    socket.on('room_error', (msg) => alert(msg));

    return () => {
      socket.off('room_created');
      socket.off('player_joined');
      socket.off('game_started');
      socket.off('room_error');
    };
  }, []);

  const handleJoin = () => {
    if (!joinCode) return;
    setIsHost(false);
    setRoomCode(joinCode);
    socket.emit('join_room', joinCode);
    setScreen('lobby');
  };

  const handleStartGame = () => {
    socket.emit('launch_game', { roomCode, gameId: selectedGame });
  };

  if (screen === 'home') {
    return (
      <div style={{ maxWidth: '1000px', margin: '60px auto', textAlign: 'center', padding: '0 20px' }}>
        <h1 style={{ fontSize: '3.5rem', color: 'var(--text-dark)', marginBottom: '10px' }}>
          MyBrick<span style={{ color: 'var(--lego-red)' }}>Games</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-grey)', marginBottom: '50px' }}>
          Entraînez-vous ou défiez vos amis pour gagner des points de fidélité !
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
          
          <div className="game-card" style={{ width: '320px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ color: 'var(--lego-blue)' }}>Mode Solo 👤</h2>
            <p style={{ color: 'var(--text-grey)', flex: 1 }}>Entraînez-vous à reproduire des mosaïques à votre rythme.</p>
            <div style={{ marginTop: '20px' }}>
              <button className="btn-lego btn-blue" onClick={() => { setIsHost(true); setScreen('playing'); }}>
                Jouer tout de suite
              </button>
            </div>
          </div>

          <div className="game-card" style={{ width: '380px', borderTop: '6px solid var(--lego-red)' }}>
            <h2 style={{ color: 'var(--lego-red)' }}>Mode Compétition 🆚</h2>
            <p style={{ color: 'var(--text-grey)', marginBottom: '25px' }}>Affrontez un ami sur le même niveau.</p>
            
            <button className="btn-lego btn-red" onClick={() => socket.emit('create_room')} style={{ marginBottom: '25px' }}>
              👑 Créer un Salon (Hôte)
            </button>
            
            <div style={{ position: 'relative', textAlign: 'center', marginBottom: '25px' }}>
              <span style={{ background: 'white', padding: '0 10px', color: 'var(--text-grey)', fontSize: '0.9rem', position: 'relative', zIndex: 1 }}>OU</span>
              <hr style={{ position: 'absolute', top: '50%', left: 0, right: 0, border: 'none', borderTop: '1px solid #e2e8f0', margin: 0, zIndex: 0 }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                className="lego-input"
                placeholder="CODE (ex: ABCD)" 
                value={joinCode} 
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())} 
                maxLength={4}
              />
              <button className="btn-lego btn-blue" onClick={handleJoin} style={{ width: 'auto' }}>
                Rejoindre
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (screen === 'lobby') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', padding: '60px 20px', flexWrap: 'wrap' }}>
        <div className="game-card" style={{ width: '450px' }}>
          <h2>Salon d'attente</h2>
          
          <div style={{ background: '#f8fafc', border: '3px dashed #cbd5e1', borderRadius: '16px', padding: '20px', textAlign: 'center', margin: '20px 0' }}>
            <span style={{ color: 'var(--text-grey)', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Code à partager</span>
            <div style={{ fontSize: '3rem', letterSpacing: '8px', fontWeight: 'bold', color: 'var(--lego-blue)', fontFamily: 'var(--font-heading)' }}>
              {roomCode}
            </div>
          </div>

          <p style={{ fontSize: '1.1rem' }}>Vous êtes : <strong style={{ color: isHost ? 'var(--lego-red)' : 'var(--lego-blue)' }}>{isHost ? 'Joueur 1 (Hôte)' : 'Joueur 2 (Invité)'}</strong></p>
          
          <div style={{ padding: '15px', background: guestArrived || !isHost ? '#f0fdf4' : '#fffbeb', border: `1px solid ${guestArrived || !isHost ? '#bbf7d0' : '#fef08a'}`, borderRadius: '10px', marginBottom: '25px', fontWeight: '600', color: guestArrived || !isHost ? '#166534' : '#854d0e' }}>
            {isHost && !guestArrived ? '⏳ En attente du Joueur 2...' : '✅ Les deux joueurs sont prêts !'}
          </div>

          {isHost ? (
            <>
              <h4 style={{ marginBottom: '10px', color: 'var(--text-grey)' }}>Choix du jeu :</h4>
              <select 
                className="lego-input" 
                value={selectedGame} 
                onChange={(e) => setSelectedGame(e.target.value)} 
                style={{ marginBottom: '25px', cursor: 'pointer' }}
              >
                <option value="reproduction">🖼️ Jeu 1 : Reproduction de Mosaïque</option>
                <option value="tetris">🧱 Jeu 2 : Casse-briques (Bientôt)</option>
              </select>
              
              <button className="btn-lego btn-red" onClick={handleStartGame} disabled={!guestArrived}>
                Lancer la partie ! 🚀
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-grey)' }}>L'hôte est en train de configurer la partie...</p>
            </div>
          )}
        </div>

        <div>
          <ChatBox socket={socket} roomCode={roomCode} userName={isHost ? 'Joueur 1' : 'Joueur 2'} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '30px', padding: '40px 20px', justifyContent: 'center', flexWrap: 'wrap' }}>
      <div className="game-card" style={{ flex: 1, maxWidth: '800px', padding: '20px' }}>
        <GameReproduction initialLevelData={gameData} /> 
      </div>
      
      {!isHost || guestArrived ? (
        <div style={{ width: '320px' }}>
          <ChatBox socket={socket} roomCode={roomCode} userName={isHost ? 'Joueur 1' : 'Joueur 2'} />
        </div>
      ) : null}
    </div>
  );
};

function App() {
  return (
    <Router>
      <header className="game-header">
        <Link to="/">⬅️ Retour Boutique</Link>
        <span style={{ color: '#ccc' }}>|</span>
        <Link to="/" style={{ color: 'var(--lego-red)' }}>Accueil Jeux</Link>
      </header>
      <Routes>
        <Route path="/" element={<MultiplayerHub />} />
      </Routes>
    </Router>
  );
}

export default App;