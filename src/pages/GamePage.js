
import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase, callEdgeFunction } from '../lib/supabase';
import Canvas from '../components/Canvas';
import DrawingTools from '../components/DrawingTools';
import ChatBox from '../components/ChatBox';
import Leaderboard from '../components/Leaderboard';
import WordSelection from '../components/WordSelection';
import GameTimer from '../components/GameTimer';
import {
  startGame,
  startRound,
  endRound,
  endGame,
  updateTimer,
  updateScores,
  setWordOptions
} from '../redux/slices/gameSlice';
import { setCanDraw, clearCanvas, addRemotePath } from '../redux/slices/canvasSlice';
import { addMessage, addCorrectGuess, setGuessResult } from '../redux/slices/chatSlice';

const GamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user, profile } = useSelector(state => state.auth);
  const { players, settings } = useSelector(state => state.room);
  const { 
    isActive, 
    drawerId, 
    currentWord, 
    wordOptions, 
    wordLength,
    timeRemaining,
    currentRound,
    totalRounds,
    isGameOver
  } = useSelector(state => state.game);

  const isDrawer = user?.id === drawerId;

  // Supabase channel for real-time updates
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`room:${roomId}`);

    // Subscribe to game events
    channel
      .on('broadcast', { event: 'game:start' }, (payload) => {
        dispatch(startGame(payload));
        dispatch(setCanDraw(payload.nextDrawer === user?.id));
      })
      .on('broadcast', { event: 'game:round' }, (payload) => {
        dispatch(startRound(payload));
        dispatch(setCanDraw(payload.drawerId === user?.id));
        dispatch(clearCanvas());
      })
      .on('broadcast', { event: 'canvas:update' }, (payload) => {
        if (payload.playerId !== user?.id) {
          dispatch(addRemotePath(payload.path));
        }
      })
      .on('broadcast', { event: 'chat:guess' }, (payload) => {
        dispatch(addMessage(payload));
      })
      .on('broadcast', { event: 'chat:correct' }, (payload) => {
        dispatch(addCorrectGuess(payload));
        dispatch(addMessage({
          type: 'system',
          text: `${payload.playerName} guessed correctly!`,
        }));
      })
      .on('broadcast', { event: 'game:round-end' }, (payload) => {
        dispatch(endRound(payload));
        dispatch(updateScores(payload.scores));
      })
      .on('broadcast', { event: 'game:over' }, (payload) => {
        dispatch(endGame(payload));
      })
      .on('broadcast', { event: 'timer:update' }, (payload) => {
        dispatch(updateTimer(payload.timeRemaining));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user?.id, dispatch]);

  // Handle canvas path updates
  const handlePathUpdate = useCallback((path) => {
    if (!isDrawer) return;
    
    const channel = supabase.channel(`room:${roomId}`);
    channel.send({
      type: 'broadcast',
      event: 'canvas:update',
      payload: { 
        path,
        playerId: user.id,
        timestamp: Date.now()
      }
    });
  }, [isDrawer, roomId, user?.id]);

  // Handle guess submission
  const handleGuessSubmit = useCallback(async (guess) => {
    if (!currentWord || isDrawer) return;

    try {
      // Submit guess to edge function
      const result = await callEdgeFunction('submit-guess', {
        guess,
        actualWord: currentWord
      });

      dispatch(setGuessResult(result));

      // Broadcast guess to other players
      const channel = supabase.channel(`room:${roomId}`);
      
      if (result.isCorrect) {
        // Broadcast correct guess
        channel.send({
          type: 'broadcast',
          event: 'chat:correct',
          payload: {
            playerId: user.id,
            playerName: profile.displayName || 'Anonymous',
            timeTaken: 60 - timeRemaining
          }
        });

        // Check if round should end
        // This would typically be handled by the server/edge function
      } else {
        // Broadcast regular guess
        channel.send({
          type: 'broadcast',
          event: 'chat:guess',
          payload: {
            type: 'guess',
            text: guess,
            playerId: user.id,
            playerName: profile.displayName || 'Anonymous',
            isClose: result.isClose
          }
        });
      }
    } catch (error) {
      console.error('Error submitting guess:', error);
    }
  }, [currentWord, isDrawer, roomId, user?.id, profile?.displayName, timeRemaining, dispatch]);

  // Handle word selection
  const handleWordSelect = useCallback(async (selectedWord) => {
    if (!isDrawer) return;

    try {
      const response = await callEdgeFunction('start-round', {
        roomId,
        drawerId: user.id,
        selectedWord,
        roundNumber: currentRound,
        usedWords: [], // This should come from game state
        drawingTime: 60
      });

      // Broadcast round start
      const channel = supabase.channel(`room:${roomId}`);
      channel.send({
        type: 'broadcast',
        event: 'game:round',
        payload: response
      });
    } catch (error) {
      console.error('Error starting round:', error);
    }
  }, [isDrawer, roomId, user?.id, currentRound]);

  if (isGameOver) {
    return <GameOverScreen />;
  }

  return (
    <div className="game-page">
      <div className="game-header">
        <div className="round-info">
          <h2>Round {currentRound} of {totalRounds}</h2>
          <GameTimer />
        </div>
        
        <div className="word-display">
          {isDrawer && currentWord ? (
            <div className="current-word">
              Draw: <strong>{currentWord}</strong>
            </div>
          ) : (
            <div className="word-blanks">
              {wordLength > 0 && (
                <div className="word-length">
                  Word: {Array(wordLength).fill('_').join(' ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="player-info">
          {isDrawer ? (
            <span className="drawer-indicator">🎨 You're drawing!</span>
          ) : (
            <span className="guesser-indicator">
              🤔 {players.find(p => p.id === drawerId)?.displayName || 'Someone'} is drawing
            </span>
          )}
        </div>
      </div>

      {/* Word selection for drawer */}
      {isDrawer && wordOptions.length > 0 && !currentWord && (
        <WordSelection
          words={wordOptions}
          onSelect={handleWordSelect}
        />
      )}

      <div className="game-content">
        <div className="drawing-area">
          <Canvas onPathUpdate={handlePathUpdate} />
          <DrawingTools />
        </div>

        <div className="game-sidebar">
          <Leaderboard />
          <ChatBox onGuessSubmit={handleGuessSubmit} />
        </div>
      </div>
    </div>
  );
};

// Game Over Screen Component
const GameOverScreen = () => {
  const navigate = useNavigate();
  const { winner, teamScores, scores } = useSelector(state => state.game);
  const { players, settings } = useSelector(state => state.room);

  const handlePlayAgain = () => {
    navigate('/');
  };

  return (
    <div className="game-over-screen">
      <div className="game-over-card">
        <h1>🎉 Game Over! 🎉</h1>
        
        {settings.isTeamGame ? (
          <div className="team-results">
            <h2>Team Results</h2>
            {/* Team standings */}
            <div className="winning-team">
              {/* Determine winning team */}
            </div>
          </div>
        ) : (
          <div className="individual-results">
            <h2>Final Standings</h2>
            {/* Individual leaderboard */}
          </div>
        )}

        <div className="final-stats">
          {/* Game statistics */}
        </div>

        <div className="game-over-actions">
          <button onClick={handlePlayAgain} className="btn-primary">
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
