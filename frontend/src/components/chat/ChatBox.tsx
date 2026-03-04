import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import '../CSS/ChatBox.css'; // import du css

interface ChatBoxProps {
  socket: Socket;
  roomCode: string;
  userName: string;
}

interface ChatMessage {
  sender: string;
  content: string;
  date: string;
}

const ChatBox = ({ socket, roomCode, userName }: ChatBoxProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const handleReceiveMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };
    socket.on('receive_message', handleReceiveMessage);
    return () => { socket.off('receive_message', handleReceiveMessage); };
  }, [socket]);

  const handleSendMessage = () => {
    if (!input.trim()) return;
    socket.emit('send_message', { roomCode, sender: userName, content: input });
    setInput('');
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        Chat du Salon {roomCode}
      </div>
      
      <div className="chat-messages">
        {messages.map((msg, idx) => {
          const isMe = msg.sender === userName;
          return (
            <div key={idx} className={isMe ? 'chat-msg-me' : 'chat-msg-other'}>
              <span className="chat-msg-sender">{msg.sender}</span>
              <div className={isMe ? 'chat-msg-bubble-me' : 'chat-msg-bubble-other'}>
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>

      <div className="chat-input-area">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Votre message..."
          className="chat-input"
        />
        <button onClick={handleSendMessage} className="chat-send-btn">
          Envoyer
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
