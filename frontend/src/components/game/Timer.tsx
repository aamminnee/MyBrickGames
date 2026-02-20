import { useState, useEffect } from 'react';

interface TimerProps {
  timeLimit: number;
  onTimeout: () => void;
  resetKey: number;
}

const Timer = ({ timeLimit, onTimeout, resetKey }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    setTimeLeft(timeLimit);
  }, [resetKey, timeLimit]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeout();
      return;
    }
    const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, onTimeout]);

  return (
    <div style={{ 
      fontSize: '24px', 
      fontWeight: 'bold', 
      color: timeLeft <= 3 ? '#D92328' : '#333',
      margin: '10px 0'
    }}>
      ⏳ Temps restant : {timeLeft}s
    </div>
  );
};

export default Timer;