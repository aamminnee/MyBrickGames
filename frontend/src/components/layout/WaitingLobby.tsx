import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import ChatBox from '../chat/ChatBox';
import ArcadeSelect from '../loyalty/ArcadeSelect';
import '../CSS/WaitingLobby.css';
import backgroundImage from '../../assets/background_8bit.jpg';

interface WaitingLobbyProps {
  roomCode: string;
  isHost: boolean;
  guestArrived: boolean;
  selectedGame: string;
  setSelectedGame: (game: string) => void;
  difficulty: string;
  setDifficulty: (diff: string) => void;
  onStartGame: () => void;
  socket: Socket;
}

const WaitingLobby = ({ 
  roomCode, isHost, guestArrived, selectedGame, setSelectedGame, 
  difficulty, setDifficulty, onStartGame, socket 
}: WaitingLobbyProps) => {

  const myPseudo = localStorage.getItem('player_username') || (isHost ? 'HÔTE' : 'INVITÉ');
  
  const [opponentPseudo, setOpponentPseudo] = useState('???');

  useEffect(() => {
    if (guestArrived || !isHost) {
      socket.emit('send_pseudo', { roomCode, pseudo: myPseudo });
    }
  }, [guestArrived, isHost, myPseudo, roomCode, socket]);

  useEffect(() => {
    const handleReceivePseudo = (data: { pseudo: string }) => {
      setOpponentPseudo(data.pseudo);
      if (isHost) {
        socket.emit('send_pseudo', { roomCode, pseudo: myPseudo });
      }
    };

    socket.on('receive_pseudo', handleReceivePseudo);
    return () => {
      socket.off('receive_pseudo', handleReceivePseudo);
    };
  }, [isHost, myPseudo, roomCode, socket]);

  useEffect(() => {
    if (!guestArrived) {
      setOpponentPseudo('???');
    }
  }, [guestArrived]);

  return (
    <div 
      className="waiting-lobby-page" 
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="lobby-container">
        <div className="lobby-card">
          <h2>— MODE VERSUS —</h2>
          
          <div className="lobby-code-box">
            <span className="lobby-code-title">CODE DU SALON</span>
            <div className="lobby-code-text">{roomCode}</div>
          </div>

          <div className="lobby-vs-zone">
            <div className={`player-box ${isHost ? 'active' : ''}`}>
              <div style={{ color: 'var(--neon-red)', marginBottom: '10px' }}>P1</div>
              <div style={{ fontSize: '0.7rem' }}>{isHost ? myPseudo : opponentPseudo}</div>
              <div className="lobby-status-ready">PRÊT</div>
            </div>

            <div className="vs-divider">VS</div>

            <div className={`player-box ${!isHost && guestArrived ? 'active' : ''}`}>
              <div style={{ color: 'var(--neon-blue)', marginBottom: '10px' }}>P2</div>
              <div style={{ fontSize: '0.7rem' }}>{!isHost ? myPseudo : opponentPseudo}</div>
              <div className={guestArrived ? "lobby-status-ready" : "lobby-status-waiting"}>
                {guestArrived ? "PRÊT" : "ATTENTE..."}
              </div>
            </div>
          </div>

          {isHost ? (
            <div className="lobby-config-zone">
              <div className="lobby-config-row">
                <span className="lobby-config-label">SÉLECTION DU JEU :</span>
                <ArcadeSelect 
                  value={selectedGame} 
                  onChange={setSelectedGame} 
                  options={[
                    { value: 'reproduction', label: 'REPRODUCTION' },
                    { value: 'tetris', label: 'CASSE-BRIQUES' }
                  ]} 
                />
              </div>

              {selectedGame === 'reproduction' && (
                <div className="lobby-config-row">
                  <span className="lobby-config-label">CHOIX DU NIVEAU :</span>
                  <ArcadeSelect 
                    value={difficulty} 
                    onChange={setDifficulty} 
                    options={[
                      { value: 'easy', label: 'FACILE (8x8)' },
                      { value: 'normal', label: 'MOYEN (10x10)' },
                      { value: 'hard', label: 'DIFFICILE (12x12)' }
                    ]} 
                  />
                </div>
              )}
              
              <button className="btn-start-game" onClick={onStartGame} disabled={!guestArrived}>
                INSERT COIN & START
              </button>
            </div>
          ) : (
            <div className="lobby-config-zone">
              <p style={{ color: 'var(--neon-cyan)', animation: 'blink-title 1.5s infinite' }}>
                L'HÔTE PRÉPARE LE DUEL...
              </p>
            </div>
          )}
        </div>

        <div className="app-chat-wrapper">
          <ChatBox 
            socket={socket} 
            roomCode={roomCode} 
            userName={myPseudo} 
          />
        </div>
      </div>
    </div>
  );
};

export default WaitingLobby;