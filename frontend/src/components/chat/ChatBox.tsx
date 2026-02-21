import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

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

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket]);

  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    // On envoie le message au serveur
    socket.emit('send_message', {
      roomCode: roomCode,
      sender: userName,
      content: input
    });
    
    setInput('');
  };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '8px', width: '300px', margin: '20px auto', display: 'flex', flexDirection: 'column', background: 'white' }}>
      <div style={{ background: '#D92328', color: 'white', padding: '10px', borderRadius: '8px 8px 0 0', fontWeight: 'bold' }}>
        💬 Chat du Salon {roomCode}
      </div>
      
      <div style={{ height: '200px', overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f9f9f9' }}>
        {messages.map((msg, idx) => {
          const isMe = msg.sender === userName;
          return (
            <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <span style={{ fontSize: '0.7rem', color: '#666', marginLeft: '5px' }}>{msg.sender}</span>
              <div style={{ 
                  background: isMe ? '#e3f2fd' : '#ffffff', 
                  border: '1px solid #e0e0e0',
                  padding: '8px 12px', 
                  borderRadius: '15px',
                  color: '#333'
              }}>
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid #ccc', padding: '5px' }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Votre message..."
          style={{ flex: 1, padding: '8px', border: 'none', outline: 'none' }}
        />
        <button onClick={handleSendMessage} style={{ background: '#D92328', color: 'white', border: 'none', borderRadius: '4px', padding: '0 15px', cursor: 'pointer' }}>
          Envoyer
        </button>
      </div>
    </div>
  );
};

export default ChatBox;