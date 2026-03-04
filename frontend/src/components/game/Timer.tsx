import { useState, useEffect } from 'react';
import '../CSS/Timer.css'; // import du css

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

  // definition de la classe selon le temps restant
  const timerClass = timeLeft <= 3 ? 'timer-warning' : 'timer-normal';

  return (
    <div className={`timer-container ${timerClass}`}>
      ⏳ temps restant : {timeLeft}s
    </div>
  );
};

export default Timer;