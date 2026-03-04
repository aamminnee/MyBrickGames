import '../CSS/HomeMenu.css'; // import du css

interface HomeMenuProps {
  selectedGame: string;
  setSelectedGame: (game: string) => void;
  joinCode: string;
  setJoinCode: (code: string) => void;
  onPlaySolo: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

const HomeMenu = ({ selectedGame, setSelectedGame, joinCode, setJoinCode, onPlaySolo, onCreateRoom, onJoinRoom }: HomeMenuProps) => (
  <div className="home-container">
    <h1 className="home-title">
      MyBrick<span className="home-title-highlight">Games</span>
    </h1>
    <p className="home-subtitle">
      entraînez-vous ou défiez vos amis pour gagner des points de fidélité !
    </p>

    <div className="home-cards-flex">
      
      {/* mode solo */}
      <div className="game-card home-card-solo">
        <h2>mode solo 👤</h2>
        <p>entraînez-vous à reproduire des mosaïques ou au tetris à votre rythme.</p>
        <div style={{ marginTop: '20px' }}>
          <select 
            className="lego-input home-select" 
            value={selectedGame} 
            onChange={(e) => setSelectedGame(e.target.value)} 
          >
            <option value="reproduction">🖼️ jeu 1 : reproduction</option>
            <option value="tetris">🧱 jeu 2 : tetris lego</option>
          </select>
          <button className="btn-lego btn-blue" onClick={onPlaySolo}>
            jouer tout de suite
          </button>
        </div>
      </div>

      {/* mode competition */}
      <div className="game-card home-card-vs">
        <h2>mode compétition 🆚</h2>
        <p>affrontez un ami sur le même niveau.</p>
        
        <button className="btn-lego btn-red" onClick={onCreateRoom} style={{ marginBottom: '25px' }}>
          👑 créer un salon (hôte)
        </button>
        
        <div className="home-divider">
          <span className="home-divider-text">ou</span>
          <hr className="home-divider-line" />
        </div>

        <div className="home-input-group">
          <input 
            className="lego-input"
            placeholder="code (ex: abcd)" 
            value={joinCode} 
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())} 
            maxLength={4}
          />
          <button className="btn-lego btn-blue" onClick={onJoinRoom} style={{ width: 'auto' }}>
            rejoindre
          </button>
        </div>
      </div>

    </div>
  </div>
);

export default HomeMenu;
