import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import GameReproduction from './pages/GameReproduction';
import GameTetris from './pages/GameTetris';
import ChatBox from './components/chat/ChatBox';
import './App.css'; 

// initialize socket connection
const socket = io('http://localhost:3000');

/**
 * main component for the multiplayer logic
 */
const MultiplayerHub = () => {
  const [screen, setScreen] = useState<'home' | 'lobby' | 'playing'>('home');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [guestArrived, setGuestArrived] = useState(false);
  const [selectedGame, setSelectedGame] = useState('reproduction');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gameData, setGameData] = useState<any>(null);

  // listen for socket events
  useEffect(() => {
    socket.on('room_created', (code: string) => {
      setRoomCode(code);
      setIsHost(true);
      setScreen('lobby');
    });

    socket.on('player_joined', () => setGuestArrived(true));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on('game_started', (data: any) => {
      setGameData(data);
      setScreen('playing');
    });

    socket.on('room_error', (msg: string) => alert(msg));

    return () => {
      socket.off('room_created');
      socket.off('player_joined');
      socket.off('game_started');
      socket.off('room_error');
    };
  }, []);

  // join an existing room
  const handleJoin = () => {
    if (!joinCode) return;
    setIsHost(false);
    setRoomCode(joinCode);
    socket.emit('join_room', joinCode);
    setScreen('lobby');
  };

  // start the game for the host
  const handleStartGame = () => {
    socket.emit('launch_game', { roomCode, gameId: selectedGame });
  };

  // display home screen
  if (screen === 'home') {
    return (
      <div style={{ maxWidth: '1000px', margin: '60px auto', textAlign: 'center', padding: '0 20px' }}>
        <h1 style={{ fontSize: '3.5rem', color: 'var(--text-dark)', marginBottom: '10px' }}>
          MyBrick<span style={{ color: 'var(--lego-red)' }}>Games</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-grey)', marginBottom: '50px' }}>
          entraînez-vous ou défiez vos amis pour gagner des points de fidélité !
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
          
          <div className="game-card" style={{ width: '320px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ color: 'var(--lego-blue)' }}>mode solo 👤</h2>
            <p style={{ color: 'var(--text-grey)', flex: 1 }}>entraînez-vous à reproduire des mosaïques ou au tetris à votre rythme.</p>
            <div style={{ marginTop: '20px' }}>
              <select 
                className="lego-input" 
                value={selectedGame} 
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedGame(e.target.value)} 
                style={{ marginBottom: '15px', cursor: 'pointer' }}
              >
                <option value="reproduction">🖼️ jeu 1 : reproduction</option>
                <option value="tetris">🧱 jeu 2 : tetris lego</option>
              </select>
              <button className="btn-lego btn-blue" onClick={() => { 
                setIsHost(true);
                // manual initialization for solo mode without the server
                setGameData({ gameId: selectedGame }); 
                setScreen('playing'); 
              }}>
                jouer tout de suite
              </button>
            </div>
          </div>

          <div className="game-card" style={{ width: '380px', borderTop: '6px solid var(--lego-red)' }}>
            <h2 style={{ color: 'var(--lego-red)' }}>mode compétition 🆚</h2>
            <p style={{ color: 'var(--text-grey)', marginBottom: '25px' }}>affrontez un ami sur le même niveau.</p>
            
            <button className="btn-lego btn-red" onClick={() => socket.emit('create_room')} style={{ marginBottom: '25px' }}>
              👑 créer un salon (hôte)
            </button>
            
            <div style={{ position: 'relative', textAlign: 'center', marginBottom: '25px' }}>
              <span style={{ background: 'white', padding: '0 10px', color: 'var(--text-grey)', fontSize: '0.9rem', position: 'relative', zIndex: 1 }}>ou</span>
              <hr style={{ position: 'absolute', top: '50%', left: 0, right: 0, border: 'none', borderTop: '1px solid #e2e8f0', margin: 0, zIndex: 0 }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                className="lego-input"
                placeholder="code (ex: abcd)" 
                value={joinCode} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinCode(e.target.value.toUpperCase())} 
                maxLength={4}
              />
              <button className="btn-lego btn-blue" onClick={handleJoin} style={{ width: 'auto' }}>
                rejoindre
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // display waiting lobby
  if (screen === 'lobby') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', padding: '60px 20px', flexWrap: 'wrap' }}>
        <div className="game-card" style={{ width: '450px' }}>
          <h2>salon d'attente</h2>
          
          <div style={{ background: '#f8fafc', border: '3px dashed #cbd5e1', borderRadius: '16px', padding: '20px', textAlign: 'center', margin: '20px 0' }}>
            <span style={{ color: 'var(--text-grey)', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase' }}>code à partager</span>
            <div style={{ fontSize: '3rem', letterSpacing: '8px', fontWeight: 'bold', color: 'var(--lego-blue)', fontFamily: 'var(--font-heading)' }}>
              {roomCode}
            </div>
          </div>

          <p style={{ fontSize: '1.1rem' }}>vous êtes : <strong style={{ color: isHost ? 'var(--lego-red)' : 'var(--lego-blue)' }}>{isHost ? 'joueur 1 (hôte)' : 'joueur 2 (invité)'}</strong></p>
          
          <div style={{ padding: '15px', background: guestArrived || !isHost ? '#f0fdf4' : '#fffbeb', border: `1px solid ${guestArrived || !isHost ? '#bbf7d0' : '#fef08a'}`, borderRadius: '10px', marginBottom: '25px', fontWeight: '600', color: guestArrived || !isHost ? '#166534' : '#854d0e' }}>
            {isHost && !guestArrived ? '⏳ en attente du joueur 2...' : '✅ les deux joueurs sont prêts !'}
          </div>

          {isHost ? (
            <>
              <h4 style={{ marginBottom: '10px', color: 'var(--text-grey)' }}>choix du jeu :</h4>
              <select 
                className="lego-input" 
                value={selectedGame} 
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedGame(e.target.value)} 
                style={{ marginBottom: '25px', cursor: 'pointer' }}
              >
                <option value="reproduction">🖼️ jeu 1 : reproduction de mosaïque</option>
                <option value="tetris">🧱 jeu 2 : casse-briques lego</option>
              </select>
              
              <button className="btn-lego btn-red" onClick={handleStartGame} disabled={!guestArrived}>
                lancer la partie ! 🚀
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-grey)' }}>l'hôte est en train de configurer la partie...</p>
            </div>
          )}
        </div>

        <div>
          <ChatBox socket={socket} roomCode={roomCode} userName={isHost ? 'joueur 1' : 'joueur 2'} />
        </div>
      </div>
    );
  }

  // display the game area
  return (
    <div style={{ display: 'flex', gap: '30px', padding: '40px 20px', justifyContent: 'center', flexWrap: 'wrap' }}>
      <div className="game-card" style={{ flex: 1, maxWidth: '900px', padding: '20px' }}>
        {gameData?.gameId === 'tetris' ? (
          <GameTetris initialLevelData={gameData?.levelData} socket={socket} roomCode={roomCode} />
        ) : (
          <GameReproduction initialLevelData={gameData?.levelData} />
        )}
      </div>
      
      {!isHost || guestArrived ? (
        <div style={{ width: '320px' }}>
          <ChatBox socket={socket} roomCode={roomCode} userName={isHost ? 'joueur 1' : 'joueur 2'} />
        </div>
      ) : null}
    </div>
  );
};

/**
 * main application component
 */
function App() {
  return (
    <Router>
      <header className="game-header">
        <Link to="/">retour boutique</Link>
        <span style={{ color: '#ccc' }}>|</span>
        <Link to="/" style={{ color: 'var(--lego-red)' }}>accueil jeux</Link>
      </header>
      <Routes>
        <Route path="/" element={<MultiplayerHub />} />
      </Routes>
    </Router>
  );
}

export default App;