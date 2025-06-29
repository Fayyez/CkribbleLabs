import React from 'react';
import { useSelector } from 'react-redux';

const GameTimer = () => {
  const { timeRemaining } = useSelector(state => state.game);

  const getTimerColor = () => {
    if (timeRemaining <= 10) return '#dc3545'; // Red
    if (timeRemaining <= 30) return '#ffc107'; // Yellow
    return '#28a745'; // Green
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timer-compact">
      <div 
        className="timer-display"
        style={{ 
          color: getTimerColor(),
          fontWeight: timeRemaining <= 10 ? 'bold' : 'normal'
        }}
      >
        ⏱️ {formatTime(timeRemaining)}
      </div>

      {/* Compact CSS Styles */}
      <style jsx>{`
        .timer-compact {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
        }

        .timer-display {
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.3s ease;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .timer-display {
          animation: ${timeRemaining <= 10 ? 'pulse 1s infinite' : 'none'};
        }
      `}</style>
    </div>
  );
};

export default GameTimer;
