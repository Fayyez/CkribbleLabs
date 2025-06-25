
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateTimer } from '../redux/slices/gameSlice';

const GameTimer = () => {
  const { timeRemaining, isActive } = useSelector(state => state.game);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isActive || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      dispatch(updateTimer(timeRemaining - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, timeRemaining, dispatch]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = () => {
    if (timeRemaining <= 10) return 'timer urgent';
    if (timeRemaining <= 30) return 'timer warning';
    return 'timer normal';
  };

  return (
    <div className={getTimerClass()}>
      <div className="timer-display">
        ⏰ {formatTime(timeRemaining)}
      </div>
      <div className="timer-bar">
        <div 
          className="timer-fill"
          style={{ width: `${(timeRemaining / 60) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default GameTimer;
