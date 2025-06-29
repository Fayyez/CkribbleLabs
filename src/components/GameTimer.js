import React from 'react';
import { useSelector } from 'react-redux';

const GameTimer = () => {
  const { timeRemaining, isActive, currentWord } = useSelector(state => state.game);
  const { user } = useSelector(state => state.auth);
  const { drawerId } = useSelector(state => state.game);
  const { settings } = useSelector(state => state.room);

  const isDrawer = user?.id === drawerId;
  const maxTime = settings?.drawingTime || 60; // Use dynamic drawing time

  const formatTime = (seconds) => {
    if (seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = () => {
    const warningThreshold = Math.max(10, maxTime * 0.2); // 20% of max time or 10s minimum
    const urgentThreshold = Math.max(5, maxTime * 0.1); // 10% of max time or 5s minimum
    
    if (timeRemaining <= urgentThreshold) return 'timer urgent';
    if (timeRemaining <= warningThreshold) return 'timer warning';
    return 'timer normal';
  };

  const getProgressPercentage = () => {
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
      
      {timeRemaining <= Math.max(5, maxTime * 0.1) && (
        <div className="timer-warning-text">
          Time's running out!
        </div>
      )}
      
      {isDrawer && timeRemaining <= Math.max(10, maxTime * 0.2) && timeRemaining > Math.max(5, maxTime * 0.1) && (
        <div className="timer-hint">
          Keep drawing! Time is running short
        </div>
      )}
    </div>
  );
};

export default GameTimer;
