import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import '../CSS/ChatBox.css';

interface ChatBoxProps {
  socket: Socket;
  roomCode: string;
  userName: string;
  variant?: 'embedded' | 'floating'; // <-- Ajout de l'option flottante
}

interface ChatMessage {
  sender: string;
  content: string;
  date: string;
}

const ChatBox = ({ socket, roomCode, userName, variant = 'embedded' }: ChatBoxProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  // États pour gérer l'ouverture du chat et les notifications
  const [isOpen, setIsOpen] = useState(variant === 'embedded');
  const [unreadCount, setUnreadCount] = useState(0);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleReceiveMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      
      // Si on reçoit un message et que le chat flottant est fermé, on augmente le compteur
      if (variant === 'floating' && !isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    };
    socket.on('receive_message', handleReceiveMessage);
    return () => { socket.off('receive_message', handleReceiveMessage); };
  }, [socket, variant, isOpen]);

  // Scroller en bas quand on ouvre le chat ou qu'un message arrive
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = () => {
    if (!input.trim()) return;
    socket.emit('send_message', { roomCode, sender: userName, content: input });
    setInput('');
  };

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0); // On remet les notifications à zéro
  };

  return (
    <>
      {/* BOUTON FLOTTANT (s'affiche uniquement si variant='floating' et que le chat est fermé) */}
      {variant === 'floating' && !isOpen && (
        <button className="chat-floating-btn" onClick={handleOpen}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unreadCount > 0 && <span className="chat-unread-badge">{unreadCount}</span>}
        </button>
      )}

      {/* CONTENEUR DU CHAT */}
      <div className={`chat-container ${variant === 'floating' ? 'chat-floating-panel' : ''} ${variant === 'floating' && !isOpen ? 'hidden' : ''}`}>
        <div className="chat-glow chat-glow--1" />
        <div className="chat-glow chat-glow--2" />

        <div className="chat-header">
          <div className="chat-header__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="chat-header__title">Chat</span>
          <div className="chat-header__badge">
            <span className="chat-header__dot" />
            <span>{messages.length}</span>
          </div>
          
          {/* Bouton de fermeture pour le mode flottant */}
          {variant === 'floating' && (
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>✕</button>
          )}
        </div>

        <div className="chat-messages" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty__icon">✦</div>
              <p>La conversation commence ici…</p>
            </div>
          )}
          {messages.map((msg, idx) => {
            const isMe = msg.sender === userName;
            return (
              <div key={idx} className={`chat-msg-wrapper ${isMe ? 'me' : 'other'}`}>
                <span className="chat-msg-sender">{isMe ? 'Vous' : msg.sender}</span>
                <div className="chat-msg-bubble">{msg.content}</div>
              </div>
            );
          })}
        </div>

        <div className={`chat-input-area ${isFocused ? 'focused' : ''}`}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Envoyer un message…"
            className="chat-input"
          />
          <button
            onClick={handleSendMessage}
            className={`chat-send-btn ${input.trim() ? 'active' : ''}`}
            disabled={!input.trim()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatBox;