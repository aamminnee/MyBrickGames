import { Socket } from 'socket.io-client';
import ChatBox from '../chat/ChatBox';
import '../CSS/WaitingLobby.css'; // import du css

interface WaitingLobbyProps {
  roomCode: string;
  isHost: boolean;
  guestArrived: boolean;
  selectedGame: string;
  setSelectedGame: (game: string) => void;
  onStartGame: () => void;
  socket: Socket;
}

const WaitingLobby = ({ roomCode, isHost, guestArrived, selectedGame, setSelectedGame, onStartGame, socket }: WaitingLobbyProps) => (
  <div className="lobby-container">
    <div className="game-card lobby-card">
      <h2>salon d'attente</h2>
      
      <div className="lobby-code-box">
        <span className="lobby-code-title">code à partager</span>
        <div className="lobby-code-text">{roomCode}</div>
      </div>

      <p style={{ fontSize: '1.1rem' }}>vous êtes : <strong style={{ color: isHost ? 'var(--lego-red)' : 'var(--lego-blue)' }}>{isHost ? 'joueur 1 (hôte)' : 'joueur 2 (invité)'}</strong></p>
      
      <div className={guestArrived || !isHost ? 'lobby-status-ready' : 'lobby-status-waiting'}>
        {isHost && !guestArrived ? '⏳ en attente du joueur 2...' : '✅ les deux joueurs sont prêts !'}
      </div>

      {isHost ? (
        <>
          <h4 style={{ marginBottom: '10px', color: 'var(--text-grey)' }}>choix du jeu :</h4>
          <select 
            className="lego-input" 
            value={selectedGame} 
            onChange={(e) => setSelectedGame(e.target.value)} 
            style={{ marginBottom: '25px', cursor: 'pointer' }}
          >
            <option value="reproduction">🖼️ jeu 1 : reproduction de mosaïque</option>
            <option value="tetris">🧱 jeu 2 : casse-briques lego</option>
          </select>
          
          <button className="btn-lego btn-red" onClick={onStartGame} disabled={!guestArrived}>
            lancer la partie ! 🚀
          </button>
        </>
      ) : (
        <p className="lobby-guest-msg">l'hôte est en train de configurer la partie...</p>
      )}
    </div>

    <div>
      <ChatBox socket={socket} roomCode={roomCode} userName={isHost ? 'joueur 1' : 'joueur 2'} />
    </div>
  </div>
);

export default WaitingLobby;
