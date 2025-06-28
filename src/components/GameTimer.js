import React from 'react';
import { useSelector } from 'react-redux';

const GameTimer = () => {
  const { timeRemaining, isActive, currentWord } = useSelector(state => state.game);
  const { user } = useSelector(state => state.auth);
  const { drawerId } = useSelector(state => state.game);

  const isDrawer = user?.id === drawerId;

  const formatTime = (seconds) => {
    if (seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = () => {
    if (timeRemaining <= 10) return 'timer urgent';
    if (timeRemaining <= 20) return 'timer warning';
    return 'timer normal';
  };

  const getProgressPercentage = () => {
    const maxTime = 60; // Total drawing time
    return Math.max(0, (timeRemaining / maxTime) * 100);
  };

  if (!isActive || !currentWord) {
    return (
      <div className="timer inactive">
        <span className="timer-text">⏸️ Paused</span>
      </div>
    );
  }

  return (
    <div className={getTimerClass()}>
      <div className="timer-display">
        <span className="timer-icon">⏰</span>
        <span className="timer-text">{formatTime(timeRemaining)}</span>
      </div>
      
      <div className="timer-progress">
        <div 
          className="timer-progress-bar"
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>
      
      {timeRemaining <= 10 && (
        <div className="timer-warning-text">
          Time's running out!
        </div>
      )}
      
      {isDrawer && timeRemaining <= 20 && timeRemaining > 10 && (
        <div className="timer-hint">
          Keep drawing! Time is running short
        </div>
      )}
    </div>
  );
};

export default GameTimer;
