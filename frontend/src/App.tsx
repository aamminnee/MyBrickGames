// main application entry point and routing
import { useState, useEffect, useRef } from 'react'; // Ajoute useRef ici
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import ReproductionGame from './components/game/reproduction/ReproductionGame';
import TetrisGame from './components/game/tetris/TetrisGame';
import ChatBox from './components/chat/ChatBox';
import Header from './components/layout/Header';
import HomeMenu from './components/layout/HomeMenu';
import WaitingLobby from './components/layout/WaitingLobby';
import LoyaltyDashboard from './components/loyalty/LoyaltyDashboard';
import './App.css'; 

// initialize socket connection
const socket = io('http://localhost:3000');

const MultiplayerHub = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const hasAttemptedJoin = useRef(false);

  const [screen, setScreen] = useState<'home' | 'lobby' | 'playing'>('home');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [guestArrived, setGuestArrived] = useState(false);
  const [selectedGame, setSelectedGame] = useState('reproduction');
  const [difficulty, setDifficulty] = useState('normal'); // added difficulty state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gameData, setGameData] = useState<any>(null);

  useEffect(() => {
    const roomFromUrl = searchParams.get('room');
    
    // On vérifie qu'on n'a pas déjà essayé de rejoindre
    if (roomFromUrl && !hasAttemptedJoin.current) {
      hasAttemptedJoin.current = true; // On verrouille immédiatement
      setJoinCode(roomFromUrl); 
      socket.emit('join_room', roomFromUrl); 
    }
  }, [searchParams]);

  // listen to socket events
  useEffect(() => {
    socket.on('room_created', (code: string) => {
      setRoomCode(code);
      setIsHost(true);
      setScreen('lobby');
      navigate(`/?room=${code}`); // <--- AJOUTE JUSTE CETTE LIGNE ICI !
    });

    socket.on('room_joined_success', (code: string) => {
      setIsHost(false);
      setRoomCode(code);
      setScreen('lobby');
      navigate(`/?room=${code}`);
    });

    socket.on('player_joined', () => setGuestArrived(true));
    socket.on('game_started', (data: any) => {
      setGameData(data);
      setScreen('playing');
    });

    socket.on('room_error', (msg: string) => {
      alert(msg);
      setJoinCode(''); // Vide le champ input
      navigate('/');   // Nettoie l'URL pour la remettre à zéro
    });


    socket.on('player_left', () => setGuestArrived(false));

    socket.on('room_closed', (msg: string) => {
      alert(msg);
      // On nettoie l'écran proprement SANS casser la connexion
      setScreen('home');
      setRoomCode('');
      setJoinCode('');
      setIsHost(false);
      setGuestArrived(false);
      setGameData(null);
      navigate('/'); // <-- Retourne à l'URL propre
    });

    socket.on('back_to_lobby', () => {
      setGameData(null); // On efface les données de la partie précédente
      setScreen('lobby'); // On reaffiche le salon
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined_success');
      socket.off('player_joined');
      socket.off('game_started');
      socket.off('room_error');
      socket.off('player_left');
      socket.off('room_closed');
      socket.off('back_to_lobby');
    };
  }, [navigate]); // N'oublie pas d'ajouter navigate ici

  // join an existing room
  const handleJoin = () => {
    if (!joinCode) return;
    // On envoie juste la demande, et on laisse room_joined_success faire le reste
    socket.emit('join_room', joinCode);
  };
  // start the game for the host
  const handleStartGame = () => {
    socket.emit('launch_game', { roomCode, gameId: selectedGame, difficulty });
  };

  // initialize a solo session locally
  const handlePlaySolo = () => {
    setIsHost(true);
    
    // Supprimez l'objet { gameId: ..., difficulty: ... }
    // Forcez gameData à null pour que le sélecteur apparaisse
    setGameData(null); 
    
    setScreen('playing'); 
  };

  // reset home and leave multiplayer server
  const handleReturnHome = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // 1. On prévient poliment le serveur qu'on quitte le salon
    if (roomCode) {
      socket.emit('leave_room');
    }
    
    // 2. On réinitialise l'interface visuelle
    setScreen('home');
    setRoomCode('');
    setJoinCode('');
    setIsHost(false);
    setGuestArrived(false);
    setGameData(null);
    
    // 3. On nettoie l'URL
    navigate('/');
  };

  return (
    <>
      <Header onReturnHome={handleReturnHome} />

      {screen === 'home' && (
        <HomeMenu 
          selectedGame={selectedGame}
          setSelectedGame={setSelectedGame}
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          onPlaySolo={handlePlaySolo}
          onCreateRoom={() => socket.emit('create_room')}
          onJoinRoom={handleJoin}
        />
      )}

      {screen === 'lobby' && (
        <WaitingLobby 
          roomCode={roomCode}
          isHost={isHost}
          guestArrived={guestArrived}
          selectedGame={selectedGame}
          setSelectedGame={setSelectedGame}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          onStartGame={handleStartGame}
          socket={socket}
        />
      )}

      {/* display playing area */}
      {screen === 'playing' && (
        <div className="app-playing-area">
          <div className="game-card app-game-card-wrapper">
            {/* On utilise gameData (multi) ou selectedGame (solo) pour choisir le jeu */}
            {(gameData?.gameId || selectedGame) === 'tetris' ? (
              <TetrisGame initialLevelData={gameData?.levelData} socket={socket} roomCode={roomCode} />
            ) : (
              <ReproductionGame 
                roomCode={roomCode} 
                socket={socket} 

                initialDifficulty={roomCode ? (isHost ? difficulty : gameData?.difficulty) : undefined} 
                isHost={isHost} 
              />
            )}
          </div>
          
          {!isHost || guestArrived ? (
            <ChatBox 
              socket={socket} 
              roomCode={roomCode} 
              userName={isHost ? 'joueur 1' : 'joueur 2'} 
              variant="floating" 
            />
          ) : null}
        </div>
      )}
    </>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MultiplayerHub />} />
        <Route path="/loyalty" element={
          <>
            <Header onReturnHome={(e) => { e.preventDefault(); window.location.href = '/'; }} />
            <LoyaltyDashboard />
          </>
        } />
      </Routes>
    </Router>
  );
}

export default App;