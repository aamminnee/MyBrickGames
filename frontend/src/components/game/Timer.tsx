import { useState, useEffect } from 'react';
import '../CSS/Timer.css';

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

  const timerClass = timeLeft <= 3 ? 'timer-warning' : 'timer-normal';
  const progress = Math.max(0, (timeLeft / timeLimit) * 100);

  return (
    <div className={`timer-container ${timerClass}`}>
      <span className="timer-label">TEMPS</span>
      <span className="timer-value">
        {timeLeft}
        <span className="timer-unit">s</span>
      </span>
      <div className="timer-bar-track">
        <div
          className="timer-bar-fill"
          style={{ width: `${progress}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
};

export default Timer;