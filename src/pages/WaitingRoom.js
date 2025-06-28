import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase, callEdgeFunction } from '../lib/supabase';
import { addPlayer, removePlayer, setRoom, setPlayers } from '../redux/slices/roomSlice';
import { startGame } from '../redux/slices/gameSlice';

const DEFAULT_AVATAR = process.env.SUPABASE_AVATAR_BUCKET_URL + 'default-pfp.jpg';

const WaitingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user, profile } = useSelector(state => state.auth);
  const { players, hostId, settings } = useSelector(state => state.room);
  
  // Refs to prevent unnecessary rerenders and track state
  const channelRef = useRef(null);
  const hasJoinedRef = useRef(false);
  const isJoiningRef = useRef(false);
  const isInitializedRef = useRef(false);
  const roomIdRef = useRef(roomId);
  const playersRef = useRef(players); // Add ref for current players
  
  // State declarations
  const [timeUntilAutoStart, setTimeUntilAutoStart] = useState(300);
  const [isStarting, setIsStarting] = useState(false);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState(null);
  const [autoStartActive, setAutoStartActive] = useState(false);
  const [roomLoading, setRoomLoading] = useState(false);

  // Update refs when state changes
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Update room ID ref when it changes
  useEffect(() => {
    if (roomId !== roomIdRef.current) {
      roomIdRef.current = roomId;
      isInitializedRef.current = false;
      hasJoinedRef.current = false;
    }
  }, [roomId]);

  // Computed values
  const isRoomCreator = user?.id === hostId && hostId !== null;
  const playerCount = players.length;
  const canStartManually = playerCount >= 2;
  const canStartTeamed = !settings.isTeamGame || (
    settings.teamNames?.every(team => 
      players.some(p => p.team === team)
    )
  );
  const canAutoStart = canStartManually && canStartTeamed;
  const team1Players = players.filter(p => p.team === settings.teamNames?.[0]);
  const team2Players = players.filter(p => p.team === settings.teamNames?.[1]);

  // Stable logging functions to prevent infinite re-renders
  const logDebug = useCallback((message, data = null) => {
    console.log(`[WaitingRoom Debug] ${message}`, data);
  }, []);

  const logError = useCallback((message, errorData = null) => {
    console.error(`[WaitingRoom Error] ${message}`, errorData);
    setError(message);
  }, []);

  const logInfo = useCallback((message, data = null) => {
    console.info(`[WaitingRoom Info] ${message}`, data);
  }, []);

  // Utility functions
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const copyRoomCode = useCallback(async () => {
    try {
      const roomLink = `${window.location.origin}/room/${roomId}/waiting`;
      await navigator.clipboard.writeText(roomLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      logInfo('Room link copied', roomLink);
    } catch (err) {
      logError('Failed to copy room link', err);
    }
  }, [roomId, logInfo, logError]);

  // Central state management function - stable dependency array
  const updateRoomState = useCallback(async (action = 'get-state', playerData = null) => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId || !user?.id) return null;

    try {
      logInfo(`Updating room state: ${action}`, { roomId: currentRoomId, userId: user.id });

      const response = await callEdgeFunction('join-room', {
        roomId: currentRoomId,
        playerId: user.id,
        playerData,
        action
      });

      if (response && response.success && response.room) {
        // Batch Redux updates to prevent multiple rerenders
        dispatch(setRoom({
          roomId: response.room.roomId,
          hostId: response.room.hostId,
          settings: response.room.settings
        }));

        dispatch(setPlayers(response.room.players));

        logInfo(`Room state updated: ${action}`, {
          roomId: response.room.roomId,
          hostId: response.room.hostId,
          playersCount: response.room.players?.length || 0
        });

        return response.room;
      } else {
        logError('Failed to update room state', response);
        return null;
      }
    } catch (error) {
      logError('Error updating room state', error);
      return null;
    }
  }, [user?.id, dispatch, logInfo, logError]); // Removed callEdgeFunction from deps

  // Initialize room data - stable function
  const initializeRoom = useCallback(async () => {
    const currentRoomId = roomIdRef.current;
    if (!currentRoomId || roomLoading || isInitializedRef.current) return;
    
    try {
      setRoomLoading(true);
      isInitializedRef.current = true;
      logInfo('Initializing room', { roomId: currentRoomId });

      const room = await updateRoomState('get-state');
      
      if (!room) {
        // Fallback settings
        logInfo('Using fallback settings');
        const fallbackSettings = {
          rounds: 3,
          drawingTime: 80,
          maxWordLength: 15,
          theme: 'default',
          isThemedGame: false,
          isTeamGame: false,
          teamNames: ['Red', 'Blue'],
        };

        dispatch(setRoom({
          roomId: currentRoomId,
          hostId: null,
          settings: fallbackSettings
        }));
      }
    } catch (error) {
      logError('Failed to initialize room', error);
      isInitializedRef.current = false; // Reset on error
    } finally {
      setRoomLoading(false);
    }
  }, [updateRoomState, roomLoading, dispatch, logInfo, logError]);

  // Handle start game
  const handleStartGame = useCallback(async () => {
    if (!isRoomCreator || !canStartManually || !canStartTeamed || isStarting) {
      logDebug('Cannot start game', { isRoomCreator, canStartManually, canStartTeamed, isStarting });
      return;
    }
    
    setIsStarting(true);
    logInfo('Starting game', { roomId, playerCount });
    
    try {
      const response = await callEdgeFunction('start-game', {
        roomId,
        hostId: user.id,
        players,
        settings
      });

      logInfo('Game start response', response);
      logInfo('Debug - Current user ID:', user.id);
      logInfo('Debug - Next drawer ID:', response.nextDrawer);
      logInfo('Debug - Is current user the drawer?', user.id === response.nextDrawer);
      logInfo('Debug - Word options:', response.wordOptions);
      logInfo('Debug - Turn order:', response.gameState?.turnOrder);
      logInfo('Debug - Full response object:', JSON.stringify(response, null, 2));

      if (!response.success) {
        throw new Error(response.error || 'Failed to start game');
      }

      // Create a dedicated channel for broadcasting game events
      const gameChannel = supabase.channel(`room:${roomId}`);
      
      try {
        // First broadcast the game start event
        logInfo('Broadcasting game start event');
        await gameChannel.send({
          type: 'broadcast',
          event: 'game:start',
          payload: {
            success: true,
            round: response.round || 1,
            nextDrawer: response.nextDrawer,
            drawerId: response.nextDrawer,
            gameState: response.gameState,
            turnOrder: response.gameState?.turnOrder || players.map(p => p.id),
            currentTurnIndex: 0,
            message: response.message,
            isActive: true,
            currentRound: response.round || 1,
            totalRounds: settings.rounds,
            timeRemaining: settings.drawingTime
          }
        });

        // Then broadcast the first round event with word options for the drawer
        if (response.nextDrawer && response.wordOptions) {
          logInfo('Broadcasting first round event with word options');
          
          // Capture values before setTimeout to prevent scope issues
          const firstDrawerId = response.nextDrawer;
          const firstRound = response.round || 1;
          const firstWordOptions = [...response.wordOptions];
          const firstTurnOrder = response.gameState?.turnOrder || players.map(p => p.id);
          
          setTimeout(async () => {
            logInfo('Executing delayed round broadcast with drawerId:', firstDrawerId);
            await gameChannel.send({
              type: 'broadcast',
              event: 'game:round',
              payload: {
                drawerId: firstDrawerId,
                roundNumber: firstRound,
                turnIndex: 0,
                wordOptions: firstWordOptions,
                timeRemaining: settings.drawingTime,
                turnOrder: firstTurnOrder
              }
            });
          }, 500); // Small delay to ensure game:start is processed first
        }
      } catch (broadcastError) {
        logError('Failed to broadcast game events', broadcastError);
        // Continue anyway - the game state is still valid
      }

      // Dispatch enhanced game start data
      dispatch(startGame({
        isActive: true,
        currentRound: response.round || 1,
        currentTurn: 1,
        totalRounds: settings.rounds,
        drawerId: response.nextDrawer,
        wordOptions: response.wordOptions || [],
        usedWords: [],
        scores: response.gameState?.scores || {},
        leaderboard: [],
        turnOrder: response.gameState?.turnOrder || players.map(p => p.id),
        gameStartTime: Date.now(),
        timeRemaining: settings.drawingTime
      }));

      logInfo('Navigating to game page');
      navigate(`/room/${roomId}/game`);
    } catch (error) {
      logError('Error starting game', error);
      setError(`Failed to start game: ${error.message}`);
      setIsStarting(false);
    }
  }, [
    isRoomCreator,
    canStartManually,
    canStartTeamed,
    isStarting,
    roomId,
    playerCount,
    user?.id,
    players,
    settings,
    dispatch,
    navigate,
    logDebug,
    logInfo,
    logError
  ]);

  // Handle team selection
  const handleTeamSelect = useCallback(async (team) => {
    if (!channelRef.current || !user || !profile) {
      logError('Cannot select team - missing data');
      return;
    }

    try {
      logInfo('Selecting team', { userId: user.id, team });
      setSelectedTeam(team);
      isJoiningRef.current = true;

      const playerData = {
        id: user.id,
        displayName: profile.displayName || 'Anonymous',
        avatarUrl: profile.avatarUrl || DEFAULT_AVATAR,
        team,
        joinedAt: new Date().toISOString(),
        isCreator: false
      };

      const room = await updateRoomState('join', playerData);

      if (room) {
        // Broadcast join event to other players
        await channelRef.current.send({
          type: 'broadcast',
          event: 'player:join',
          payload: playerData
        });

        setShowTeamSelection(false);
        hasJoinedRef.current = true;
        logInfo('Team selection complete', { team, totalPlayers: room.players.length });
      } else {
        throw new Error('Failed to join room with team selection');
      }
    } catch (error) {
      logError('Error selecting team', error);
    } finally {
      isJoiningRef.current = false;
    }
  }, [user, profile, updateRoomState, logInfo, logError]);

  // Handle joining room
  const joinRoom = useCallback(async () => {
    if (!user || !profile || !channelRef.current || hasJoinedRef.current || isJoiningRef.current) {
      return;
    }

    try {
      isJoiningRef.current = true;
      logInfo('Joining room', { userId: user.id, displayName: profile.displayName });

      const playerData = {
        id: user.id,
        displayName: profile.displayName || 'Anonymous',
        avatarUrl: profile.avatarUrl || DEFAULT_AVATAR,
        team: settings.isTeamGame ? null : null,
        joinedAt: new Date().toISOString(),
        isCreator: false
      };

      if (settings.isTeamGame && !selectedTeam) {
        logInfo('Team game - showing team selection');
        setShowTeamSelection(true);
        return;
      }

      const room = await updateRoomState('join', playerData);

      if (room) {
        // Broadcast join event to other players
        await channelRef.current.send({
          type: 'broadcast',
          event: 'player:join',
          payload: playerData
        });

        hasJoinedRef.current = true;
        logInfo('Successfully joined room', { 
          roomId, 
          playerId: user.id, 
          totalPlayers: room.players.length 
        });
      } else {
        throw new Error('Failed to join room - invalid response');
      }
    } catch (error) {
      logError('Error joining room', error);
    } finally {
      isJoiningRef.current = false;
    }
  }, [user, profile, settings.isTeamGame, selectedTeam, roomId, updateRoomState, logInfo, logError]);

  // Initialize room on mount - only run once per roomId
  useEffect(() => {
    console.log('[WaitingRoom] Component mounted');
    if (!isInitializedRef.current) {
      initializeRoom();
    }
  }, []); // Empty dependency array - only run once on mount

  // Auto-start timer effect
  useEffect(() => {
    if (!canAutoStart || !isRoomCreator) {
      setAutoStartActive(false);
      setTimeUntilAutoStart(300);
      return;
    }

    if (!autoStartActive) {
      setAutoStartActive(true);
      logInfo('Auto-start activated');
    }

    if (timeUntilAutoStart <= 0) {
      logInfo('Auto-start timer expired');
      handleStartGame();
      return;
    }

    const timer = setInterval(() => {
      setTimeUntilAutoStart(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeUntilAutoStart, canAutoStart, autoStartActive, isRoomCreator, handleStartGame, logInfo]);

  // Channel setup effect - stable, doesn't recreate on players change
  useEffect(() => {
    if (!roomId || !user?.id) return;

    logInfo('Setting up channel', { roomId, userId: user.id });

    const newChannel = supabase.channel(`room:${roomId}`, {
      config: { broadcast: { self: false } }
    });
    
    newChannel
      .on('broadcast', { event: 'player:join' }, (data) => {
        logInfo('Player join broadcast received', data);
        
        const payload = data.payload || data;
        const playerData = payload.player || payload;
        
        if (!playerData || !playerData.id) {
          logError('Invalid player join payload', { data, payload, playerData });
          return;
        }
        
        const player = {
          id: playerData.id,
          displayName: playerData.displayName || 'Anonymous',
          avatarUrl: playerData.avatarUrl || DEFAULT_AVATAR,
          team: playerData.team || null,
          joinedAt: playerData.joinedAt || new Date().toISOString(),
          isCreator: playerData.isCreator || false
        };
        
        // Use ref to check current players without stale closure
        const currentPlayers = playersRef.current;
        if (!currentPlayers.some(p => p.id === player.id)) {
          dispatch(addPlayer(player));
          logInfo('Added new player to room', { player, currentPlayerCount: currentPlayers.length });
        } else {
          logInfo('Player already exists, skipping duplicate', { playerId: player.id });
        }
      })
      .on('broadcast', { event: 'player:leave' }, (payload) => {
        if (payload?.playerId) {
          dispatch(removePlayer(payload.playerId));
          logInfo('Player left room', { playerId: payload.playerId });
        }
      })
      .on('broadcast', { event: 'game:starting' }, (payload) => {
        logInfo('Game starting notification received', payload);
        navigate(`/room/${roomId}/game`);
      })
      .on('broadcast', { event: 'game:start' }, (payload) => {
        logInfo('Game start event received in WaitingRoom', payload);
        // Redirect all players to the game page when game starts
        navigate(`/room/${roomId}/game`);
      })
      .subscribe((status) => {
        logInfo('Channel status', status);
        if (status === 'SUBSCRIBED') {
          channelRef.current = newChannel;
          // Auto-join when channel is ready
          if (user && profile && !hasJoinedRef.current) {
            setTimeout(() => joinRoom(), 500);
          }
        } else if (status === 'CHANNEL_ERROR') {
          logError('Channel error occurred', status);
        } else if (status === 'CLOSED') {
          logInfo('Channel closed', status);
          channelRef.current = null;
        }
      });

    return () => {
      logInfo('Cleaning up channel');
      if (newChannel && user?.id) {
        newChannel.send({
          type: 'broadcast',
          event: 'player:leave',
          payload: { playerId: user.id }
        }).catch(err => logError('Error sending leave notification', err));
        supabase.removeChannel(newChannel);
      }
      channelRef.current = null;
    };
  }, [roomId, user?.id, user, profile, dispatch, navigate, joinRoom, logInfo, logError]); // Removed players-dependent handlers

  // Render logic
  if (roomLoading) {
    return (
      <div className="waiting-room">
        <div className="waiting-room-header">
          <h1>🔄 Loading Room...</h1>
          <p>Please wait while we fetch room information</p>
        </div>
      </div>
    );
  }

  if (error && error.includes('Error')) {
    return (
      <div className="waiting-room">
        <div className="waiting-room-header">
          <h1>⚠️ Connection Error</h1>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (showTeamSelection) {
    return (
      <div className="waiting-room">
        <div className="team-selection">
          <h2>Choose Your Team</h2>
          <p>Select a team to join the game room</p>
          
          <div className="team-buttons">
            {settings.teamNames?.map((team, index) => (
              <button
                key={team}
                onClick={() => handleTeamSelect(team)}
                className={`team-btn ${index === 0 ? 'team-red' : 'team-blue'}`}
                disabled={isJoiningRef.current}
              >
                Join Team {team}
                <div className="team-count">
                  {index === 0 ? team1Players.length : team2Players.length} players
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="waiting-room">
      <div className="waiting-room-header">
        <div>
          <h1>🎨 Waiting Room</h1>
          <div className="room-code">
            Room: <strong>{roomId}</strong>
            <button onClick={copyRoomCode} className="btn-secondary">
              📋 {copySuccess ? 'Copied!' : 'Invite'}
            </button>
          </div>
        </div>

        {autoStartActive && isRoomCreator && (
          <div className="auto-start-timer">
            <div className="timer-display">{formatTime(timeUntilAutoStart)}</div>
            <div className="timer-label">Auto-start</div>
          </div>
        )}

        <div className="player-count">
          {playerCount}/22 players
        </div>
      </div>

      <div className="waiting-room-content">
        <div className="room-settings">
          <h2>🎮 Game Settings</h2>
          <div className="settings-grid">
            <div className="setting-item">
              <span className="label">Rounds:</span>
              <span className="value">{settings.rounds}</span>
            </div>
            <div className="setting-item">
              <span className="label">Drawing Time:</span>
              <span className="value">{settings.drawingTime}s</span>
            </div>
            <div className="setting-item">
              <span className="label">Theme:</span>
              <span className="value">{settings.isThemedGame ? settings.theme : 'Mixed'}</span>
            </div>
            <div className="setting-item">
              <span className="label">Mode:</span>
              <span className="value">{settings.isTeamGame ? 'Team Game' : 'Individual'}</span>
            </div>
          </div>
        </div>

        <div className="game-status">
          <span className="status-text">Ready</span>
          <span className={`status-indicator ${canStartManually && canStartTeamed ? 'ready' : 'not-ready'}`}>●</span>
        </div>

        <div className="team-players">
          <h2>👥 Players ({playerCount}/22)</h2>
          
          {settings.isTeamGame ? (
            <div className="teams-layout">
              <div className="team-group team-red">
                <h4>🔴 Team {settings.teamNames?.[0]} ({team1Players.length})</h4>
                <div className="players-list">
                  {team1Players.map(player => (
                    <div key={player.id} className="player-card">
                      <img 
                        src={player.avatarUrl || DEFAULT_AVATAR} 
                        alt={player.displayName}
                        className="player-avatar"
                      />
                      <span className="player-name">{player.displayName}</span>
                      {player.id === hostId && (
                        <span className="host-badge">Creator</span>
                      )}
                    </div>
                  ))}
                  {team1Players.length === 0 && (
                    <div className="empty-team">No players yet</div>
                  )}
                </div>
              </div>

              <div className="team-group team-blue">
                <h4>🔵 Team {settings.teamNames?.[1]} ({team2Players.length})</h4>
                <div className="players-list">
                  {team2Players.map(player => (
                    <div key={player.id} className="player-card">
                      <img 
                        src={player.avatarUrl || DEFAULT_AVATAR} 
                        alt={player.displayName}
                        className="player-avatar"
                      />
                      <span className="player-name">{player.displayName}</span>
                      {player.id === hostId && (
                        <span className="host-badge">Creator</span>
                      )}
                    </div>
                  ))}
                  {team2Players.length === 0 && (
                    <div className="empty-team">No players yet</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="players-list">
              {players.map(player => (
                <div key={player.id} className="player-card">
                  <img 
                    src={player.avatarUrl || DEFAULT_AVATAR} 
                    alt={player.displayName}
                    className="player-avatar"
                  />
                  <div className="player-info">
                    <span className="player-name">{player.displayName}</span>
                    {player.id === hostId && (
                      <span className="host-badge">Creator</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {playerCount === 0 && (
            <div className="empty-room">
              <p>Waiting for players to join...</p>
            </div>
          )}
        </div>

        <div className="waiting-room-actions">
          {isRoomCreator && (
            <button
              onClick={handleStartGame}
              disabled={!canStartManually || !canStartTeamed || isStarting}
              className={`btn-large ${
                canStartManually && canStartTeamed && !isStarting
                  ? 'btn-primary'
                  : 'btn-disabled'
              }`}
            >
              {isStarting ? '⏳ Starting...' : '🚀 Start Game Now'}
            </button>
          )}
          
          {!canStartManually && (
            <div className="start-requirement">
              ⚠️ Need at least 2 players to start
            </div>
          )}
          
          {!canStartTeamed && settings.isTeamGame && (
            <div className="start-requirement">
              ⚠️ Each team needs at least one player
            </div>
          )}

          {isJoiningRef.current && (
            <div className="joining-status">
              🔄 Joining room...
            </div>
          )}

          {!isRoomCreator && hostId && (
            <div className="start-requirement">
              ℹ️ Waiting for room creator to start the game
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom; 