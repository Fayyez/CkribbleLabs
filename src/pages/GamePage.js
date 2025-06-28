import React, { useEffect, useCallback, useMemo } from 'react';
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
  setWordOptions,
  selectWord
} from '../redux/slices/gameSlice';
import { setCanDraw, clearCanvas, addRemotePath } from '../redux/slices/canvasSlice';
import { addMessage, addCorrectGuess, setGuessResult, clearChat } from '../redux/slices/chatSlice';
import { setPlayers, addPlayer, removePlayer } from '../redux/slices/roomSlice';

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
    isGameOver,
    scores,
    turnOrder,
    currentTurnIndex
  } = useSelector(state => state.game);
  const { correctGuesses } = useSelector(state => state.chat);

  const isDrawer = user?.id === drawerId;
  const hasGuessedCorrectly = correctGuesses.some(g => g.playerId === user?.id);

  // Initialize room state if needed
  useEffect(() => {
    const initializeRoomState = async () => {
      if (!roomId || !user?.id || players.length > 0) return;
      
      try {
        console.log('🔧 Initializing room state for GamePage');
        const response = await callEdgeFunction('join-room', {
          roomId,
          playerId: user.id,
          action: 'get-state'
        });
        
        if (response?.success && response?.room) {
          console.log('🏠 Got room state:', response.room);
          dispatch(setPlayers(response.room.players || []));
        }
      } catch (error) {
        console.error('❌ Failed to initialize room state:', error);
      }
    };
    
    initializeRoomState();
  }, [roomId, user?.id, players.length, dispatch]);

  // Debug drawer state changes
  useEffect(() => {
    console.log('🎨 DRAWER STATE CHANGE:', {
      userId: user?.id,
      drawerId,
      isDrawer,
      timestamp: Date.now()
    });
  }, [drawerId, user?.id, isDrawer]);

  // Debug correctGuesses changes
  useEffect(() => {
    console.log('✅ CORRECT GUESSES CHANGE:', {
      correctGuesses,
      hasGuessedCorrectly,
      currentUserId: user?.id,
      timestamp: Date.now()
    });
  }, [correctGuesses, hasGuessedCorrectly, user?.id]);

  // Add debug logging for state changes
  useEffect(() => {
    console.log('=== GamePage State Debug ===');
    console.log('Room ID:', roomId);
    console.log('User ID:', user?.id);
    console.log('Profile:', profile);
    console.log('Players:', players);
    console.log('Settings:', settings);
    console.log('Game State:', {
      isActive,
      drawerId,
      currentWord,
      wordOptions,
      wordLength,
      timeRemaining,
      currentRound,
      totalRounds,
      isGameOver,
      scores,
      turnOrder,
      currentTurnIndex
    });
    console.log('Is Drawer:', isDrawer);
    console.log('Has Guessed Correctly:', hasGuessedCorrectly);
    console.log('Correct Guesses:', correctGuesses);
    console.log('===========================');
  }, [roomId, user?.id, profile, players, settings, isActive, drawerId, currentWord, wordOptions, wordLength, timeRemaining, currentRound, totalRounds, isGameOver, scores, turnOrder, currentTurnIndex, isDrawer, hasGuessedCorrectly, correctGuesses]);

  // Generate masked word display (removed hints functionality)
  const maskedWord = useMemo(() => {
    if (!currentWord) return '';
    if (isDrawer || hasGuessedCorrectly) return currentWord;
    
    // Simple underscore display without hints
    return currentWord.split('').map(letter => {
      if (letter === ' ') return ' ';
      return '_';
    }).join(' ');
  }, [currentWord, isDrawer, hasGuessedCorrectly]);

  // Calculate points based on guess speed
  const calculatePoints = useCallback((timeTaken) => {
    const maxPoints = 100;
    const timeFactor = Math.max(0, (60 - timeTaken) / 60);
    return Math.round(maxPoints * timeFactor);
  }, []);

  // Supabase channel for real-time updates
  useEffect(() => {
    if (!roomId) {
      console.log('❌ No roomId provided, skipping channel setup');
      return;
    }

    console.log('🔗 Setting up Supabase channel for room:', roomId);
    const channel = supabase.channel(`room:${roomId}`);

    channel
      .on('broadcast', { event: 'player:join' }, (payload) => {
        console.log('👤 Player join event received in GamePage:', payload);
        const playerData = payload.payload || payload;
        if (playerData && playerData.id && !players.find(p => p.id === playerData.id)) {
          dispatch(addPlayer(playerData));
        }
      })
      .on('broadcast', { event: 'player:leave' }, (payload) => {
        console.log('👋 Player leave event received in GamePage:', payload);
        const playerData = payload.payload || payload;
        
        if (playerData?.playerId) {
          dispatch(removePlayer(playerData.playerId));
          
          // Add a system message about the player leaving
          dispatch(addMessage({
            type: 'system',
            text: `${playerData.playerName || 'A player'} left the game`,
            timestamp: Date.now()
          }));
          
          // Check if we need to end the game due to insufficient players
          const remainingPlayers = players.filter(p => p.id !== playerData.playerId);
          console.log('👥 Remaining players after leave:', remainingPlayers.length);
          
          // For non-team games, end if only 1 player remains
          if (!settings?.isTeamGame && remainingPlayers.length <= 1) {
            console.log('🏁 Ending game - not enough players remaining');
            setTimeout(() => {
              dispatch(endGame({
                winner: remainingPlayers[0]?.id || null,
                reason: 'insufficient_players',
                finalScores: scores
              }));
            }, 2000);
          }
          // For team games, check if entire team left
          else if (settings?.isTeamGame) {
            const teamCounts = remainingPlayers.reduce((counts, player) => {
              const team = player.team || 'Red';
              counts[team] = (counts[team] || 0) + 1;
              return counts;
            }, {});
            
            const activeTeams = Object.keys(teamCounts).filter(team => teamCounts[team] > 0);
            console.log('🏷️ Active teams:', activeTeams, 'Team counts:', teamCounts);
            
            if (activeTeams.length <= 1) {
              console.log('🏁 Ending team game - only one team remains');
              setTimeout(() => {
                dispatch(endGame({
                  winner: activeTeams[0] || null,
                  reason: 'team_insufficient',
                  finalScores: scores,
                  teamScores: teamCounts
                }));
              }, 2000);
            }
          }
        }
      })
      .on('broadcast', { event: 'game:start' }, (event) => {
        console.log('🎮 GAME START EVENT received:', event);
        const payload = event.payload || event;
        console.log('🎮 Extracted payload:', payload);
        console.log('Current user ID:', user?.id);
        console.log('Players available:', players);
        
        const gameData = {
          ...payload,
          turnOrder: payload.turnOrder || players.map(p => p.id),
          currentTurnIndex: 0
        };
        
        console.log('Dispatching startGame with data:', gameData);
        dispatch(startGame(gameData));
        
        const canDraw = payload.nextDrawer === user?.id || payload.drawerId === user?.id;
        console.log('Setting canDraw to:', canDraw, 'for user:', user?.id);
        dispatch(setCanDraw(canDraw));
        dispatch(clearChat());
        
        // Check if we need to start the first round
        const firstDrawerId = payload.nextDrawer || payload.drawerId;
        if (firstDrawerId && firstDrawerId === user?.id) {
          console.log('🎨 This user is the first drawer, should receive word options soon');
        } else {
          console.log('👀 This user is not the first drawer, firstDrawerId:', firstDrawerId);
        }
      })
      .on('broadcast', { event: 'game:round' }, (event) => {
        console.log('🎯 ROUND START EVENT received:', event);
        const payload = event.payload || event;
        console.log('🎯 Extracted payload:', payload);
        console.log('Payload drawerId:', payload.drawerId);
        console.log('Current user ID:', user?.id);
        console.log('Is this user the drawer?', payload.drawerId === user?.id);
        
        dispatch(startRound(payload));
        dispatch(setCanDraw(payload.drawerId === user?.id));
        dispatch(clearCanvas());
        dispatch(clearChat());
        
        // If this player is the drawer, set word options
        if (payload.drawerId === user?.id && payload.wordOptions) {
          console.log('🎲 Setting word options for drawer:', payload.wordOptions);
          dispatch(setWordOptions(payload.wordOptions));
        } else if (payload.drawerId === user?.id) {
          console.log('⚠️ User is drawer but no wordOptions provided in payload');
        } else {
          console.log('👥 User is not drawer, drawerId is:', payload.drawerId);
        }
      })
      .on('broadcast', { event: 'word:selected' }, (event) => {
        console.log('📝 WORD SELECTED EVENT received:', event);
        const payload = event.payload || event;
        const selectedWord = payload.word || payload.selectedWord;
        console.log('📝 Extracted word:', selectedWord, 'wordLength:', payload.wordLength);
        
        if (selectedWord) {
          dispatch(selectWord(selectedWord));
          dispatch(setWordOptions([])); // Clear word options for all players
          console.log('📝 Word selection processed for all players');
        } else {
          console.error('❌ No word found in word:selected event payload:', payload);
        }
      })
      .on('broadcast', { event: 'canvas:update' }, (payload) => {
        if (payload.playerId !== user?.id) {
          console.log('🎨 Received remote canvas update:', payload);
          dispatch(addRemotePath(payload.path));
        }
      })
      .on('broadcast', { event: 'canvas:clear' }, (payload) => {
        console.log('🧹 Canvas clear event received');
        dispatch(clearCanvas());
      })
      .on('broadcast', { event: 'chat:guess' }, (payload) => {
        console.log('💬 CHAT GUESS EVENT received:', payload);
        dispatch(addMessage(payload));
      })
      .on('broadcast', { event: 'chat:correct' }, (payload) => {
        console.log('✅ CORRECT GUESS EVENT received:', payload);
        dispatch(addCorrectGuess(payload));
        dispatch(addMessage({
          type: 'system',
          text: `${payload.playerName} guessed correctly!`,
          timestamp: Date.now()
        }));
      })
      .on('broadcast', { event: 'chat:close' }, (payload) => {
        console.log('🔥 CLOSE GUESS EVENT received:', payload);
        dispatch(addMessage({
          type: 'system-close',
          text: `${payload.playerName}'s guess is very close!`,
          timestamp: Date.now()
        }));
      })
      .on('broadcast', { event: 'timer:update' }, (payload) => {
        console.log('⏰ Timer update received:', payload.timeRemaining);
        dispatch(updateTimer(payload.timeRemaining));
      })
      .on('broadcast', { event: 'game:round-end' }, (payload) => {
        console.log('🏁 ROUND END EVENT received:', payload);
        dispatch(endRound(payload));
        dispatch(updateScores(payload.scores));
        
        // Show the word to everyone
        dispatch(addMessage({
          type: 'system',
          text: `The word was: ${payload.word}`,
          timestamp: Date.now()
        }));

        // If there's a next drawer, prepare for next round
        if (!payload.isGameOver && payload.nextDrawer) {
          console.log('🔄 Preparing next round with drawer:', payload.nextDrawer);
          setTimeout(() => {
            console.log('🎲 Calling start-round to generate words for next drawer');
            // Generate words for next drawer
            callEdgeFunction('start-round', {
              roomId,
              drawerId: payload.nextDrawer,
              roundNumber: payload.nextRound,
              turnIndex: payload.nextTurnIndex || 0,
              turnOrder: turnOrder || players.map(p => p.id),
              usedWords: payload.usedWords || [],
              theme: settings?.theme || 'default',
              action: 'generate_words'
            }).then(result => {
              console.log('📦 start-round response for next round:', result);
              if (result.wordOptions) {
                console.log('📡 Broadcasting next round start event');
                channel.send({
                  type: 'broadcast',
                  event: 'game:round',
                  payload: {
                    drawerId: payload.nextDrawer,
                    roundNumber: payload.nextRound,
                    turnIndex: payload.nextTurnIndex || 0,
                    wordOptions: result.wordOptions
                  }
                });
              } else {
                console.log('❌ No wordOptions in start-round response for next round');
              }
            }).catch(error => {
              console.error('❌ Failed to start next round:', error);
            });
          }, 3000); // 3 second delay before next round
        } else if (payload.isGameOver) {
          console.log('🎉 Game is over!');
        } else {
          console.log('⚠️ Round ended but no next drawer provided');
        }
      })
      .on('broadcast', { event: 'game:over' }, (payload) => {
        console.log('🎉 GAME OVER EVENT received:', payload);
        dispatch(endGame(payload));
      })
      .subscribe();

    console.log('📡 Channel subscribed for room:', roomId);

    return () => {
      console.log('🔌 Removing channel for room:', roomId);
      supabase.removeChannel(channel);
    };
  }, [roomId, user?.id, dispatch, players, settings, turnOrder]);

  // Timer synchronization for drawer
  useEffect(() => {
    if (!isDrawer || !isActive || !currentWord) return;

    const timerInterval = setInterval(() => {
      dispatch((dispatch, getState) => {
        const currentTime = getState().game.timeRemaining;
        const newTime = currentTime - 1;
        
        dispatch(updateTimer(newTime));
        
        // Broadcast timer update to other players
        const channel = supabase.channel(`room:${roomId}`);
        channel.send({
          type: 'broadcast',
          event: 'timer:update',
          payload: {
            timeRemaining: newTime
          }
        });
        
        // Auto-end round when time runs out
        if (newTime <= 0) {
          console.log('⏰ Timer reached 0, ending round');
          handleTimeUp();
        }
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [isDrawer, isActive, currentWord, roomId, handleTimeUp]);

  // Handle time up
  const handleTimeUp = useCallback(async () => {
    if (!isDrawer) return;
    
    console.log('⏰ Time ran out, ending round');
    const playerScores = correctGuesses.map(g => ({
      playerId: g.playerId,
      points: calculatePoints(g.timeTaken || 0),
      timeTaken: g.timeTaken || 0,
      guessedCorrectly: true
    }));

    console.log('📊 Ending round due to timeout with scores:', playerScores);

    try {
      const roundResult = await callEdgeFunction('end-round', {
        roomId,
        currentDrawerId: drawerId,
        word: currentWord,
        playerScores,
        currentRound,
        totalRounds,
        turnOrder: turnOrder || players.map(p => p.id),
        currentTurnIndex: currentTurnIndex || 0,
        reason: 'timeout'
      });

      console.log('📦 end-round response for timeout:', roundResult);
      const channel = supabase.channel(`room:${roomId}`);
      channel.send({
        type: 'broadcast',
        event: 'game:round-end',
        payload: roundResult
      });
    } catch (error) {
      console.error('❌ Failed to end round on timeout:', error);
    }
  }, [isDrawer, roomId, currentWord, correctGuesses, calculatePoints, drawerId, currentRound, totalRounds, turnOrder, currentTurnIndex, players]);

  // Handle canvas path updates
  const handlePathUpdate = useCallback((path) => {
    if (!isDrawer) return;
    
    console.log('🎨 Canvas path update from drawer');
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

  // Handle canvas clear
  const handleCanvasClear = useCallback(() => {
    if (!isDrawer) return;
    
    console.log('🧹 Canvas clear from drawer');
    const channel = supabase.channel(`room:${roomId}`);
    channel.send({
      type: 'broadcast',
      event: 'canvas:clear',
      payload: { 
        playerId: user.id,
        timestamp: Date.now()
      }
    });
  }, [isDrawer, roomId, user?.id]);

  // Handle guess submission
  const handleGuessSubmit = useCallback(async (guess) => {
    if (!currentWord || isDrawer || hasGuessedCorrectly) {
      console.log('🚫 Guess blocked:', { 
        hasCurrentWord: !!currentWord, 
        isDrawer, 
        hasGuessedCorrectly 
      });
      return;
    }

    console.log('🤔 Submitting guess:', guess, 'against word:', currentWord);

    try {
      const result = await callEdgeFunction('submit-guess', {
        guess,
        actualWord: currentWord
      });

      console.log('💭 Guess result:', result);
      dispatch(setGuessResult(result));

      const channel = supabase.channel(`room:${roomId}`);
      const timeTaken = 60 - timeRemaining;
      
      if (result.isCorrect) {
        const points = calculatePoints(timeTaken);
        console.log('✅ Correct guess! Points awarded:', points);
        
        // Broadcast correct guess
        channel.send({
          type: 'broadcast',
          event: 'chat:correct',
          payload: {
            playerId: user.id,
            playerName: profile.displayName || 'Anonymous',
            timeTaken,
            points
          }
        });

        // Check if all players have guessed correctly
        const totalGuessers = players.length - 1; // Exclude drawer
        const currentCorrectGuesses = correctGuesses.length + 1; // Include this guess
        
        console.log('📊 Checking if round should end:', {
          totalGuessers,
          currentCorrectGuesses,
          shouldEndRound: currentCorrectGuesses >= totalGuessers
        });
        
        if (currentCorrectGuesses >= totalGuessers) {
          console.log('🏁 All players guessed correctly, ending round early');
          // End round early - all players have guessed correctly
          setTimeout(() => {
            const playerScores = [
              ...correctGuesses.map(g => ({
                playerId: g.playerId,
                points: calculatePoints(g.timeTaken || 0),
                timeTaken: g.timeTaken || 0,
                guessedCorrectly: true
              })),
              {
                playerId: user.id,
                points,
                timeTaken,
                guessedCorrectly: true
              }
            ];

            console.log('📊 Ending round with scores:', playerScores);

            callEdgeFunction('end-round', {
              roomId,
              currentDrawerId: drawerId,
              word: currentWord,
              playerScores,
              currentRound,
              totalRounds,
              turnOrder: turnOrder || players.map(p => p.id),
              currentTurnIndex: currentTurnIndex || 0,
              reason: 'all_guessed'
            }).then(roundResult => {
              console.log('📦 end-round response:', roundResult);
              channel.send({
                type: 'broadcast',
                event: 'game:round-end',
                payload: roundResult
              });
            }).catch(error => {
              console.error('❌ Failed to end round:', error);
            });
          }, 1000);
        }
      } else {
        console.log('❌ Incorrect guess, isClose:', result.isClose);
        // Broadcast regular guess or close guess
        if (result.isClose) {
          channel.send({
            type: 'broadcast',
            event: 'chat:close',
            payload: {
              playerId: user.id,
              playerName: profile.displayName || 'Anonymous'
            }
          });
        }
        
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
      console.error('❌ Error submitting guess:', error);
    }
  }, [currentWord, isDrawer, hasGuessedCorrectly, roomId, user?.id, profile?.displayName, timeRemaining, correctGuesses.length, players.length, calculatePoints, dispatch, drawerId, currentRound, totalRounds, turnOrder, currentTurnIndex]);

  // Handle word selection
  const handleWordSelect = useCallback(async (selectedWord) => {
    if (!isDrawer) {
      console.log('🚫 Word selection blocked - user is not drawer');
      return;
    }

    console.log('📝 Drawer selecting word:', selectedWord);

    try {
      // Start the round with selected word
      const roundResult = await callEdgeFunction('start-round', {
        roomId,
        drawerId: user.id,
        selectedWord,
        roundNumber: currentRound,
        turnIndex: currentTurnIndex || 0,
        turnOrder: turnOrder || players.map(p => p.id),
        usedWords: [], // TODO: track used words
        drawingTime: settings?.drawingTime || 60,
        theme: settings?.theme || 'default',
        action: 'start_round'
      });

      console.log('📦 start-round response after word selection:', roundResult);

      // Clear word options immediately to close popup
      dispatch(setWordOptions([]));
      dispatch(selectWord(selectedWord));
      
      // Broadcast word selection (without revealing the word to others)
      const channel = supabase.channel(`room:${roomId}`);
      console.log('📡 Broadcasting word selection');
      channel.send({
        type: 'broadcast',
        event: 'word:selected',
        payload: {
          word: selectedWord,
          wordLength: selectedWord.length,
          drawerId: user.id
        }
      });

      // Start the round timer
      console.log('⏰ Starting round timer');
      const initialTime = settings?.drawingTime || 60;
      dispatch(updateTimer(initialTime));
      
      // Broadcast timer start to all players
      setTimeout(() => {
        channel.send({
          type: 'broadcast',
          event: 'timer:update',
          payload: {
            timeRemaining: initialTime
          }
        });
      }, 100);
    } catch (error) {
      console.error('❌ Error selecting word:', error);
    }
  }, [isDrawer, roomId, user?.id, dispatch, currentRound, currentTurnIndex, turnOrder, players, settings]);

  // Handle player leaving (cleanup)
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (roomId && user?.id) {
        try {
          // Don't await this since the page is closing
          callEdgeFunction('join-room', {
            roomId,
            playerId: user.id,
            action: 'leave'
          });
        } catch (error) {
          console.error('Error leaving room on unload:', error);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && roomId && user?.id) {
        // User switched tabs or minimized browser, but don't leave room
        console.log('🙈 User went away, but staying in room');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomId, user?.id]);

  // Cleanup when component unmounts (navigation away)
  useEffect(() => {
    return () => {
      if (roomId && user?.id && profile) {
        console.log('🚪 GamePage unmounting, leaving room');
        
        // Broadcast leave event to other players first
        const channel = supabase.channel(`room:${roomId}`);
        channel.send({
          type: 'broadcast',
          event: 'player:leave',
          payload: {
            playerId: user.id,
            playerName: profile.displayName || 'Anonymous',
            timestamp: Date.now()
          }
        });
        
        // Then actually leave the room
        callEdgeFunction('join-room', {
          roomId,
          playerId: user.id,
          action: 'leave'
        }).catch(error => {
          console.error('Error leaving room on unmount:', error);
        });
      }
    };
  }, [roomId, user?.id, profile]);

  if (isGameOver) {
    console.log('🎉 Rendering GameOverScreen');
    return <GameOverScreen />;
  }

  console.log('🎮 Rendering main GamePage');

  return (
    <div className="game-page">
      {/* Top Header with Word Display */}
      <div className="game-header">
        <div className="round-info">
          <h2>Round {currentRound} of {totalRounds}</h2>
          <div className="timer-container">
            {isActive && <GameTimer />}
          </div>
        </div>
        
        <div className="word-display-center">
          {isDrawer && currentWord ? (
            <div className="current-word">
              <span className="word-label">Draw:</span>
              <span className="word-text">{currentWord}</span>
            </div>
          ) : currentWord || wordLength > 0 ? (
            <div className="word-blanks">
              <span className="word-label">Word:</span>
              <span className="masked-word">{maskedWord || Array(wordLength).fill('_').join(' ')}</span>
            </div>
          ) : (
            <div className="waiting-word">
              Waiting for word selection...
            </div>
          )}
        </div>

        <div className="player-status">
          {isDrawer ? (
            <span className="drawer-indicator">🎨 You're drawing!</span>
          ) : drawerId ? (
            <span className="guesser-indicator">
              🤔 {players.find(p => p.id === drawerId)?.displayName || 'Someone'} is drawing
            </span>
          ) : (
            <span className="waiting-drawer">
              🎮 Waiting for drawer...
            </span>
          )}
          {hasGuessedCorrectly && !isDrawer && (
            <span className="guessed-correctly">✅ Correct!</span>
          )}
        </div>
      </div>

      {/* Word selection modal */}
      {isDrawer && wordOptions.length > 0 && !currentWord && (
        <WordSelection
          words={wordOptions}
          onSelect={handleWordSelect}
        />
      )}

      {/* Main Game Content */}
      <div className="game-content">
        {/* Left side - Drawing area */}
        <div className="drawing-section">
          <Canvas 
            onPathUpdate={handlePathUpdate} 
            onCanvasClear={handleCanvasClear}
          />
          {isDrawer && <DrawingTools onCanvasClear={handleCanvasClear} />}
        </div>

        {/* Right side - Leaderboard and Chat */}
        <div className="game-sidebar">
          <Leaderboard />
          <ChatBox 
            onGuessSubmit={handleGuessSubmit}
            canGuess={!isDrawer && !hasGuessedCorrectly && isActive && currentWord}
          />
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

  const sortedPlayers = useMemo(() => {
    return players
      .map(player => ({
        ...player,
        score: scores[player.id] || 0
      }))
      .sort((a, b) => b.score - a.score);
  }, [players, scores]);

  const handlePlayAgain = () => {
    navigate('/');
  };

  return (
    <div className="game-over-screen">
      <div className="game-over-card">
        <h1>🎉 Game Over! 🎉</h1>
        
        <div className="final-standings">
          <h2>Final Standings</h2>
          <div className="winner-announcement">
            <div className="winner-crown">👑</div>
            <div className="winner-name">{sortedPlayers[0]?.displayName || 'Unknown'}</div>
            <div className="winner-score">{sortedPlayers[0]?.score || 0} points</div>
          </div>
          
          <div className="standings-list">
            {sortedPlayers.map((player, index) => (
              <div key={player.id} className={`standing-item ${index === 0 ? 'winner' : ''}`}>
                <span className="position">#{index + 1}</span>
                <span className="player-avatar">{player.avatarUrl}</span>
                <span className="player-name">{player.displayName}</span>
                <span className="player-score">{player.score || 0} pts</span>
              </div>
            ))}
          </div>
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
