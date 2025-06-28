import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateTimer } from '../redux/slices/gameSlice';

const GameTimer = () => {
  const { timeRemaining, isActive, currentWord } = useSelector(state => state.game);
  const { user } = useSelector(state => state.auth);
  const { drawerId } = useSelector(state => state.game);
  const dispatch = useDispatch();

  const isDrawer = user?.id === drawerId;

  useEffect(() => {
    if (!isActive || timeRemaining <= 0 || !currentWord) return;

    const timer = setInterval(() => {
      if (timeRemaining > 0) {
        dispatch(updateTimer(timeRemaining - 1));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, timeRemaining, currentWord, dispatch]);

  const formatTime = (seconds) => {
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

  const getHintStatus = () => {
    const elapsed = 60 - timeRemaining;
    const hintStartTime = 30; // Hints start after 30 seconds
    
    if (elapsed < hintStartTime) {
      return {
        message: `Hints start in ${hintStartTime - elapsed}s`,
        active: false
      };
    } else {
      const hintsRevealed = Math.floor((elapsed - hintStartTime) / 5);
      return {
        message: `${hintsRevealed} hint${hintsRevealed !== 1 ? 's' : ''} revealed`,
        active: true
      };
    }
  };

  if (!isActive || !currentWord) {
    return (
      <div className="timer waiting">
        <div className="timer-display waiting">
          ⏳ Waiting...
        </div>
      </div>
    );
  }

  const hintStatus = getHintStatus();

  return (
    <div className={getTimerClass()}>
      <div className="timer-display">
        ⏰ {formatTime(timeRemaining)}
      </div>
      
      <div className="timer-bar">
        <div 
          className="timer-fill"
          style={{ 
            width: `${getProgressPercentage()}%`,
            transition: 'width 1s ease-in-out'
          }}
        />
      </div>

      {isDrawer && (
        <div className="timer-info">
          <div className={`hint-status ${hintStatus.active ? 'active' : 'waiting'}`}>
            💡 {hintStatus.message}
          </div>
          
          {timeRemaining <= 30 && (
            <div className="timer-warning-text">
              {timeRemaining <= 10 ? '⚠️ Time almost up!' : 'ℹ️ Hints are revealing!'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameTimer;
