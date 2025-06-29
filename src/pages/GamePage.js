import React, { useEffect, useCallback, useMemo, useRef } from 'react';
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
  selectWord,
  resetGameOverState
} from '../redux/slices/gameSlice';
import { setCanDraw, clearCanvas, addRemotePath } from '../redux/slices/canvasSlice';
import { addMessage, addCorrectGuess, setGuessResult, clearChat } from '../redux/slices/chatSlice';
import { setPlayers, addPlayer, removePlayer } from '../redux/slices/roomSlice';

const GamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Use ref to store channel instance to prevent recreation
  const channelRef = useRef(null);
  
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
      if (!roomId || !user?.id) return;
      
      // Always try to get fresh room state when component mounts
      try {
        console.log('🔧 Initializing room state for GamePage, current players:', players.length);
        const response = await callEdgeFunction('join-room', {
          roomId,
          playerId: user.id,
          playerData: profile ? {
            id: user.id,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            team: null,
            joinedAt: new Date().toISOString(),
            isCreator: false
          } : undefined,
          action: players.length === 0 ? 'join' : 'get-state'
        });
        
        if (response?.success && response?.room) {
          console.log('🏠 Got room state:', response.room);
          if (response.room.players && response.room.players.length > 0) {
            dispatch(setPlayers(response.room.players));
            console.log('✅ Successfully set players from room state:', response.room.players.length);
          }
          
          // Update settings if they're different
          if (response.room.settings && JSON.stringify(response.room.settings) !== JSON.stringify(settings)) {
            console.log('🔧 Updating settings from room state:', response.room.settings);
            // You might want to dispatch an action to update settings in room slice
          }
        } else {
          console.warn('⚠️ No room state received or invalid response');
        }
      } catch (error) {
        console.error('❌ Failed to initialize room state:', error);
      }
    };
    
    // Initialize immediately
    initializeRoomState();
    
    // Also re-initialize if players list becomes empty (connection issues)
    if (players.length === 0) {
      const retryTimeout = setTimeout(initializeRoomState, 2000);
      return () => clearTimeout(retryTimeout);
    }
  }, [roomId, user?.id, profile, dispatch]);

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
    console.log('Players Count:', players.length);
    console.log('Players Details:', players.map(p => ({ id: p.id, name: p.displayName })));
    console.log('Settings:', settings);
    console.log('Game State:', {
      isActive,
      drawerId,
      currentWord,
      wordOptions: wordOptions.length,
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
    
    // Critical diagnostic
    if (isGameOver && isActive === false) {
      console.error('🚨 GAME OVER CONDITION DETECTED!');
      console.error('🚨 isGameOver:', isGameOver);
      console.error('🚨 isActive:', isActive);
      console.error('🚨 Players count:', players.length);
      console.error('🚨 This should not happen during normal gameplay!');
    }
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

  // Helper function to get or create channel
  const getChannel = useCallback(() => {
    if (!channelRef.current) {
      channelRef.current = supabase.channel(`room:${roomId}`);
    }
    return channelRef.current;
  }, [roomId]);

  // State consistency monitor and auto-recovery
  useEffect(() => {
    // Check for inconsistent game state and auto-fix
    const checkStateConsistency = () => {
      // If we have word options but game is marked as game over, that's inconsistent
      if (isGameOver && wordOptions.length > 0 && isDrawer && !currentWord) {
        console.warn('🔧 Detected inconsistent state: game over but drawer has word options');
        console.warn('🔧 Auto-fixing: resetting game over state');
        dispatch(resetGameOverState());
        return;
      }

      // If we're in an active game with a drawer but no word and no options, regenerate options
      if (isActive && isDrawer && !currentWord && wordOptions.length === 0 && players.length > 1) {
        console.warn('🔧 Detected missing word options for active drawer');
        console.warn('🔧 Auto-fixing: regenerating word options');
        
        const regenerateWords = async () => {
          try {
            const wordResult = await callEdgeFunction('start-round', {
              roomId,
              drawerId: user.id,
              roundNumber: currentRound,
              turnIndex: currentTurnIndex || 0,
              turnOrder: turnOrder || players.map(p => p.id),
              usedWords: [],
              theme: settings?.theme || 'default',
              action: 'generate_words'
            });
            
            if (wordResult?.wordOptions) {
              dispatch(setWordOptions(wordResult.wordOptions));
              console.log('✅ Auto-recovery: Word options regenerated successfully');
            }
          } catch (error) {
            console.error('❌ Auto-recovery failed:', error);
          }
        };
        
        regenerateWords();
      }
    };

    // Run consistency check after a short delay to allow state to settle
    const timeoutId = setTimeout(checkStateConsistency, 1000);
    return () => clearTimeout(timeoutId);
  }, [isGameOver, wordOptions, isDrawer, currentWord, isActive, players.length, roomId, user?.id, currentRound, currentTurnIndex, turnOrder, settings?.theme, dispatch]);

  // Supabase channel for real-time updates
  useEffect(() => {
    if (!roomId) {
      console.log('❌ No roomId provided, skipping channel setup');
      return;
    }

    console.log('🔗 Setting up Supabase channel for room:', roomId);
    const channel = getChannel();

    channel
      .on('broadcast', { event: 'player:join' }, (event) => {
        console.log('👤 Player join event received in GamePage:', event);
        const playerData = event.payload || event;
        if (playerData && playerData.id && !players.find(p => p.id === playerData.id)) {
          console.log('✅ Adding new player to game:', playerData);
          dispatch(addPlayer(playerData));
        } else {
          console.log('👥 Player already exists or invalid data:', playerData);
        }
      })
      .on('broadcast', { event: 'player:leave' }, (payload) => {
        console.log('👋 Player leave event received in GamePage:', payload);
        const playerData = payload.payload || payload;
        
        if (playerData?.playerId && playerData.playerId !== user?.id) {
          console.log('🔍 Processing player leave for:', playerData.playerId);
          console.log('🔍 Current players before removal:', players.map(p => ({ id: p.id, name: p.displayName })));
          
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
          console.log('👥 Remaining players details:', remainingPlayers.map(p => ({ id: p.id, name: p.displayName })));
          
          // CRITICAL: Only end game if we're truly in an active game state with multiple players originally
          // and now have insufficient players, AND the game was actually started (not just in lobby)
          const shouldEndGame = isActive && 
                                currentWord && // Game must have actually started with a word
                                remainingPlayers.length > 0 && 
                                remainingPlayers.length <= 1 && 
                                !settings?.isTeamGame;
          
          console.log('🎯 Game ending analysis:', {
            isActive,
            hasCurrentWord: !!currentWord,
            remainingCount: remainingPlayers.length,
            isTeamGame: settings?.isTeamGame,
            shouldEndGame
          });
          
          if (shouldEndGame) {
            console.log('🏁 Ending game - not enough players remaining for active game');
            setTimeout(() => {
              dispatch(endGame({
                winner: remainingPlayers[0]?.id || null,
                reason: 'insufficient_players',
                finalScores: scores
              }));
            }, 2000);
          } else if (settings?.isTeamGame && isActive && currentWord) {
            // For team games, check if entire team left
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
          } else {
            console.log('🔄 Not ending game - conditions not met for game end', {
              isActive,
              hasCurrentWord: !!currentWord,
              remainingCount: remainingPlayers.length,
              reason: 'insufficient_conditions'
            });
          }
        } else if (playerData?.playerId === user?.id) {
          console.log('🚫 Ignoring own leave event to prevent premature game ending');
        } else {
          console.log('⚠️ Invalid player leave data:', playerData);
        }
      })
      .on('broadcast', { event: 'game:start' }, (event) => {
        console.log('🎮 GAME START EVENT received:', event);
        const payload = event.payload || event;
        console.log('🎮 Extracted payload:', payload);
        console.log('Current user ID:', user?.id);
        console.log('Players available before game start:', players.map(p => ({ id: p.id, name: p.displayName })));
        
        // Ensure we have players data - if not, try to get it from the payload
        if (players.length === 0 && payload.players) {
          console.log('🔧 Setting players from game start payload:', payload.players);
          dispatch(setPlayers(payload.players));
        }
        
        const gameData = {
          ...payload,
          turnOrder: payload.turnOrder || players.map(p => p.id),
          currentTurnIndex: 0,
          settings: payload.gameState?.settings || settings // Include settings
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
        
        // Enhanced payload with proper word length
        const enhancedPayload = {
          ...payload,
          drawingTime: payload.drawingTime || settings?.drawingTime || 60
        };
        
        dispatch(startRound(enhancedPayload));
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
        const drawerId = payload.drawerId;
        console.log('📝 Extracted word:', selectedWord, 'wordLength:', payload.wordLength, 'drawerId:', drawerId);
        
        if (selectedWord) {
          dispatch(selectWord(selectedWord));
          dispatch(setWordOptions([])); // Clear word options for all players
          
          // Set canvas drawing permissions
          const canUserDraw = drawerId === user?.id;
          console.log('🎨 Setting canvas permission - canDraw:', canUserDraw, 'for user:', user?.id);
          dispatch(setCanDraw(canUserDraw));
          
          console.log('📝 Word selection processed for all players');
        } else {
          console.error('❌ No word found in word:selected event payload:', payload);
        }
      })
      .on('broadcast', { event: 'canvas:update' }, (event) => {
        const payload = event.payload || event;
        console.log('🎨 Canvas update event:', event);
        console.log('🎨 Canvas payload:', payload);
        
        if (payload && payload.playerId !== user?.id) {
          console.log('🎨 Processing remote canvas update from:', payload.playerId);
          dispatch(addRemotePath(payload));
        } else if (payload && payload.playerId === user?.id) {
          console.log('🎨 Ignoring own canvas update');
        } else {
          console.log('🎨 Invalid canvas payload:', payload);
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
      .on('broadcast', { event: 'timer:update' }, (event) => {
        const payload = event.payload || event;
        console.log('⏰ Timer update received:', payload);
        if (payload && typeof payload.timeRemaining === 'number') {
          dispatch(updateTimer(payload.timeRemaining));
        } else {
          console.warn('⚠️ Invalid timer payload:', payload);
        }
      })
      .on('broadcast', { event: 'game:round-end' }, (event) => {
        console.log('🏁 TURN/ROUND END EVENT received:', event);
        const payload = event.payload || event;
        
        dispatch(endRound(payload));
        dispatch(updateScores(payload.scores));
        
        // Show the word to everyone
        dispatch(addMessage({
          type: 'system',
          text: `The word was: ${payload.word}`,
          timestamp: Date.now()
        }));

        // Show round progress
        if (payload.isNewRound) {
          dispatch(addMessage({
            type: 'system',
            text: `🎉 Round ${payload.nextRound - 1} completed! Starting Round ${payload.nextRound}`,
            timestamp: Date.now()
          }));
        }

        // If there's a next drawer, prepare for next turn/round
        if (!payload.isGameOver && payload.nextDrawer) {
          const actionType = payload.isNewRound ? 'round' : 'turn';
          console.log(`🔄 Preparing next ${actionType} with drawer:`, payload.nextDrawer);
          
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
              console.log(`📦 start-${actionType} response:`, result);
              if (result.wordOptions) {
                console.log(`📡 Broadcasting next ${actionType} start event`);
                const channel = getChannel();
                if (channel && channel.state === 'joined') {
                  channel.send({
                    type: 'broadcast',
                    event: 'game:round',
                    payload: {
                      drawerId: payload.nextDrawer,
                      roundNumber: payload.nextRound,
                      turnIndex: payload.nextTurnIndex || 0,
                      wordOptions: result.wordOptions,
                      drawingTime: settings?.drawingTime || 60,
                      isNewRound: payload.isNewRound
                    }
                  });
                }
              } else {
                console.log(`❌ No wordOptions in start-${actionType} response`);
              }
            }).catch(error => {
              console.error(`❌ Failed to start next ${actionType}:`, error);
            });
          }, 3000); // 3 second delay before next turn/round
        } else if (payload.isGameOver) {
          console.log('🎉 Game is completely over!');
          dispatch(addMessage({
            type: 'system',
            text: `🎉 Game Over! All ${payload.gameProgress?.currentRound || totalRounds} rounds completed!`,
            timestamp: Date.now()
          }));
        } else {
          console.log('⚠️ Turn ended but no next drawer provided');
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId, user?.id, getChannel]);

  // Handle time up - ends current turn, not entire round
  const handleTimeUp = useCallback(async () => {
    if (!isDrawer) return;
    
    console.log('⏰ Time ran out, ending turn for drawer:', drawerId);
    const playerScores = correctGuesses.map(g => ({
      playerId: g.playerId,
      points: calculatePoints(g.timeTaken || 0),
      timeTaken: g.timeTaken || 0,
      guessedCorrectly: true
    }));

    console.log('📊 Ending turn due to timeout with scores:', playerScores);

    try {
      const turnResult = await callEdgeFunction('end-round', {
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

      console.log('📦 end-turn response for timeout:', turnResult);
      const channel = getChannel();
      if (channel && channel.state === 'joined') {
        channel.send({
          type: 'broadcast',
          event: 'game:round-end',
          payload: turnResult
        });
      }
    } catch (error) {
      console.error('❌ Failed to end turn on timeout:', error);
    }
  }, [isDrawer, roomId, currentWord, correctGuesses, calculatePoints, drawerId, currentRound, totalRounds, turnOrder, currentTurnIndex, players, getChannel]);

  // Timer synchronization for drawer
  useEffect(() => {
    if (!isDrawer || !isActive || !currentWord) return;

    console.log('⏰ Starting timer for drawer, initial time:', timeRemaining);
    
    const timerInterval = setInterval(() => {
      dispatch((dispatch, getState) => {
        const currentTime = getState().game.timeRemaining;
        const newTime = Math.max(0, currentTime - 1);
        
        console.log('⏰ Timer tick:', currentTime, '→', newTime);
        dispatch(updateTimer(newTime));
        
        // Broadcast timer update to other players
        const channel = getChannel();
        if (channel && channel.state === 'joined') {
          channel.send({
            type: 'broadcast',
            event: 'timer:update',
            payload: {
              timeRemaining: newTime
            }
          });
        }
        
        // Auto-end round when time runs out
        if (newTime <= 0) {
          console.log('⏰ Timer reached 0, ending round');
          clearInterval(timerInterval); // Clear interval before ending round
          handleTimeUp();
        }
      });
    }, 1000);

    return () => {
      console.log('⏰ Clearing timer interval');
      clearInterval(timerInterval);
    };
  }, [isDrawer, isActive, currentWord, getChannel, handleTimeUp]);

  // Handle canvas path updates
  const handlePathUpdate = useCallback((path) => {
    if (!isDrawer) return;
    
    console.log('🎨 Canvas path update from drawer, path:', path);
    const channel = getChannel();
    if (channel && channel.state === 'joined' && path) {
      channel.send({
        type: 'broadcast',
        event: 'canvas:update',
        payload: path // Send the path directly, not nested
      });
    } else {
      console.warn('⚠️ Cannot send canvas update:', { 
        channelState: channel?.state, 
        hasPath: !!path 
      });
    }
  }, [isDrawer, getChannel, user?.id]);

  // Handle canvas clear
  const handleCanvasClear = useCallback(() => {
    if (!isDrawer) return;
    
    console.log('🧹 Canvas clear from drawer');
    const channel = getChannel();
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

      const channel = getChannel();
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
    if (!isDrawer || !selectedWord) {
      console.log('🚫 Word selection blocked:', { 
        isDrawer, 
        hasSelectedWord: !!selectedWord 
      });
      return;
    }

    console.log('📝 Drawer selecting word:', selectedWord);

    try {
      // Immediately update UI state to prevent modal from showing
      dispatch(setWordOptions([]));
      dispatch(selectWord(selectedWord));
      
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
      
      // Validate the response
      if (!roundResult || !roundResult.selectedWord) {
        throw new Error('Invalid response from start-round function');
      }
      
      // Broadcast word selection (without revealing the word to others)
      const channel = getChannel();
      if (channel && channel.state === 'joined') {
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
          if (channel && channel.state === 'joined') {
            channel.send({
              type: 'broadcast',
              event: 'timer:update',
              payload: {
                timeRemaining: initialTime
              }
            });
          }
        }, 100);
      } else {
        console.warn('⚠️ Channel not available for broadcasting');
      }
    } catch (error) {
      console.error('❌ Error selecting word:', error);
      // Restore word options on error
      if (wordOptions.length === 0) {
        console.log('🔄 Attempting to regenerate word options due to error');
        try {
          const wordResult = await callEdgeFunction('start-round', {
            roomId,
            drawerId: user.id,
            roundNumber: currentRound,
            turnIndex: currentTurnIndex || 0,
            turnOrder: turnOrder || players.map(p => p.id),
            usedWords: [],
            theme: settings?.theme || 'default',
            action: 'generate_words'
          });
          
          if (wordResult?.wordOptions) {
            dispatch(setWordOptions(wordResult.wordOptions));
            console.log('✅ Word options regenerated successfully');
          }
        } catch (regenerateError) {
          console.error('❌ Failed to regenerate word options:', regenerateError);
        }
      }
    }
  }, [isDrawer, roomId, user?.id, dispatch, currentRound, currentTurnIndex, turnOrder, players, settings, getChannel, wordOptions]);

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
      } else if (!document.hidden && roomId && user?.id) {
        console.log('👀 User came back to the game');
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
        
        try {
          // Broadcast leave event to other players first
          const channel = getChannel();
          if (channel && channel.state === 'joined') {
            channel.send({
              type: 'broadcast',
              event: 'player:leave',
              payload: {
                playerId: user.id,
                playerName: profile.displayName || 'Anonymous',
                timestamp: Date.now()
              }
            });
          }
          
          // Then actually leave the room
          callEdgeFunction('join-room', {
            roomId,
            playerId: user.id,
            action: 'leave'
          }).catch(error => {
            console.error('Error leaving room on unmount:', error);
          });
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
    };
  }, [roomId, user?.id, profile, getChannel]);

  // Defensive check - only show game over screen if game is actually over
  // Prevent premature game over screen due to state corruption
  const shouldShowGameOver = isGameOver && (
    !isActive || // Game is definitely inactive
    players.length <= 1 || // Actually insufficient players
    (currentRound > totalRounds) // Game completed all rounds
  );

  if (shouldShowGameOver) {
    console.log('🎉 Rendering GameOverScreen');
    console.log('🎉 Game over conditions:', { isGameOver, currentWord, isActive, playersCount: players.length });
    return <GameOverScreen />;
  } else if (isGameOver && !shouldShowGameOver) {
    console.warn('⚠️ isGameOver is true but conditions not met, forcing game to continue');
    console.warn('⚠️ Diagnostic:', { isGameOver, currentWord, isActive, playersCount: players.length });
    // Force reset the game over state if it's incorrectly set
    dispatch(resetGameOverState());
  }

  console.log('🎮 Rendering main GamePage');

  return (
    <div className="game-page">
      {/* Top Header with Word Display */}
      <div className="game-header">
        <div className="round-info">
          <h2>Round {currentRound} of {totalRounds}</h2>
          {turnOrder.length > 0 && (
            <div className="turn-info">
              Player {(currentTurnIndex || 0) + 1} of {turnOrder.length} drawing
            </div>
          )}
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
          ) : (currentWord && wordLength > 0) ? (
            <div className="word-blanks">
              <span className="word-label">Word ({wordLength} letters):</span>
              <span className="masked-word">{maskedWord}</span>
            </div>
          ) : wordLength > 0 ? (
            <div className="word-blanks">
              <span className="word-label">Word ({wordLength} letters):</span>
              <span className="masked-word">{Array(wordLength).fill('_').join(' ')}</span>
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
            canGuess={true} // Always allow chat access, internal logic will handle guess restrictions
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
