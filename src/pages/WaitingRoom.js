import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase, callEdgeFunction } from '../lib/supabase';
import { addPlayer, removePlayer, updatePlayer, setRoom } from '../redux/slices/roomSlice';
import { startGame } from '../redux/slices/gameSlice';

const DEFAULT_AVATAR = process.env.SUPABASE_AVATAR_BUCKET_URL + 'default-pfp.jpg';

const WaitingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user, profile } = useSelector(state => state.auth);
  const { players, hostId, settings } = useSelector(state => state.room);
  
  // State declarations
  const [timeUntilAutoStart, setTimeUntilAutoStart] = useState(300);
  const [isStarting, setIsStarting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState(null);
  const [channel, setChannel] = useState(null);
  const [autoStartActive, setAutoStartActive] = useState(false);
  const [roomLoading, setRoomLoading] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

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

  // Logging functions (defined first)
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

  // Core functions (defined before useEffect that uses them)
  const handleStartGame = useCallback(async () => {
    console.log('[WaitingRoom] handleStartGame called', {
      isRoomCreator,
      canStartManually,
      canStartTeamed,
      isStarting
    });
    
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

      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'game:starting',
          payload: response
        });
      }

      dispatch(startGame(response));
      navigate(`/room/${roomId}/game`);
    } catch (error) {
      logError('Error starting game', error);
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
    channel,
    dispatch,
    navigate,
    logDebug,
    logInfo,
    logError
  ]);

  const handleTeamSelect = useCallback(async (team) => {
    if (!channel || !user || !profile) {
      logError('Cannot select team - missing data');
      return;
    }

    try {
      logInfo('Selecting team', { userId: user.id, team });
      setSelectedTeam(team);

      const playerData = {
        id: user.id,
        displayName: profile.displayName || 'Anonymous',
        avatarUrl: profile.avatarUrl || DEFAULT_AVATAR,
        team,
        joinedAt: new Date().toISOString(),
        isCreator: user.id === hostId
      };

      dispatch(addPlayer(playerData));
      
      await channel.send({
        type: 'broadcast',
        event: 'player:join',
        payload: { player: playerData }
      });

      setShowTeamSelection(false);
      setHasJoined(true);
      setIsJoining(false);
      logInfo('Team selection complete', { team });
    } catch (error) {
      logError('Error selecting team', error);
    }
  }, [channel, user, profile, dispatch, hostId, logInfo, logError]);

  const joinRoom = useCallback(async () => {
    console.log('[WaitingRoom] joinRoom called', {
      hasUser: !!user,
      hasProfile: !!profile,
      hasChannel: !!channel,
      hasJoined,
      isJoining
    });
    
    if (!user || !profile || !channel || hasJoined || isJoining) {
      logDebug('Cannot join room - conditions not met', { 
        hasUser: !!user, 
        hasProfile: !!profile, 
        hasChannel: !!channel, 
        hasJoined, 
        isJoining 
      });
      return;
    }

    try {
      setIsJoining(true);
      logInfo('Joining room', { userId: user.id, displayName: profile.displayName });

      const playerData = {
        id: user.id,
        displayName: profile.displayName || 'Anonymous',
        avatarUrl: profile.avatarUrl || DEFAULT_AVATAR,
        team: settings.isTeamGame ? null : null,
        joinedAt: new Date().toISOString(),
        isCreator: user.id === hostId
      };

      if (settings.isTeamGame && !selectedTeam) {
        logInfo('Team game - showing team selection');
        setShowTeamSelection(true);
        setIsJoining(false);
        return;
      }

      dispatch(addPlayer(playerData));
      
      await channel.send({
        type: 'broadcast',
        event: 'player:join',
        payload: { player: playerData }
      });

      setHasJoined(true);
      setIsJoining(false);
      logInfo('Successfully joined room');
    } catch (error) {
      logError('Error joining room', error);
      setIsJoining(false);
    }
  }, [
    user,
    profile,
    channel,
    settings.isTeamGame,
    selectedTeam,
    hasJoined,
    isJoining,
    dispatch,
    hostId,
    logDebug,
    logInfo,
    logError
  ]);

  const fetchRoomData = useCallback(async () => {
    if (!roomId) return;
    if (hostId !== null && hostId !== undefined) return;

    try {
      setRoomLoading(true);
      logInfo('Fetching room data', { roomId });

      const response = await callEdgeFunction('join-room', {
        roomId,
        playerId: user?.id
      });

      if (response.success) {
        const defaultSettings = {
          rounds: 3,
          drawingTime: 80,
          maxWordLength: 15,
          theme: 'default',
          isThemedGame: false,
          isTeamGame: false,
          teamNames: ['Red', 'Blue'],
        };

        dispatch(setRoom({
          roomId,
          hostId: null,
          settings: defaultSettings
        }));

        logInfo('Room data fetched successfully');
      } else {
        throw new Error(response.error || 'Room validation failed');
      }
    } catch (error) {
      logError('Failed to fetch room data', error);
      setError('Room not found. Redirecting...');
      setTimeout(() => navigate('/'), 3000);
    } finally {
      setRoomLoading(false);
    }
  }, [roomId, hostId, user?.id, dispatch, navigate, logInfo, logError]);

  // Effects (now that all functions are defined)
  useEffect(() => {
    console.log('[WaitingRoom] Component mounted');
    fetchRoomData();
  }, [fetchRoomData]);

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

  useEffect(() => {
    if (!roomId || !user?.id) return;

    logInfo('Setting up channel', { roomId, userId: user.id });

    const newChannel = supabase.channel(`room:${roomId}`, {
      config: { broadcast: { self: false } }
    });
    
    newChannel
      .on('broadcast', { event: 'player:join' }, (payload) => {
        logInfo('Player join broadcast received', payload);
        
        if (!payload?.player) {
          logError('Invalid player join payload', payload);
          return;
        }
        
        const player = {
          id: payload.player.id,
          displayName: payload.player.displayName || 'Anonymous',
          avatarUrl: payload.player.avatarUrl || DEFAULT_AVATAR,
          team: payload.player.team || null,
          joinedAt: payload.player.joinedAt || new Date().toISOString(),
          isCreator: payload.player.isCreator || false
        };
        
        if (player.isCreator && !hostId) {
          logInfo('Setting room creator', { playerId: player.id });
          dispatch(setRoom({ roomId, hostId: player.id, settings }));
        }
        
        const existingPlayer = players.find(p => p.id === player.id);
        if (!existingPlayer) {
          dispatch(addPlayer(player));
        }
      })
      .on('broadcast', { event: 'player:leave' }, (payload) => {
        if (payload?.playerId) {
          dispatch(removePlayer(payload.playerId));
        }
      })
      .on('broadcast', { event: 'game:starting' }, (payload) => {
        logInfo('Game starting notification', payload);
        navigate(`/room/${roomId}/game`);
      })
      .subscribe((status) => {
        logInfo('Channel status', status);
        if (status === 'SUBSCRIBED') {
          setChannel(newChannel);
        }
      });

    return () => {
      if (newChannel && hasJoined) {
        newChannel.send({
          type: 'broadcast',
          event: 'player:leave',
          payload: { playerId: user.id }
        }).catch(console.error);
      }
      supabase.removeChannel(newChannel);
    };
  }, [roomId, user?.id, hasJoined, players, dispatch, navigate, hostId, settings, logInfo, logError]);

  useEffect(() => {
    if (channel && !hasJoined && !isJoining && user && profile) {
      logInfo('Auto-joining room');
      joinRoom();
    }
  }, [channel, hasJoined, isJoining, user, profile, joinRoom, logInfo]);

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

        <div className="start-requirements">
          <h3>Ready to Start?</h3>
          <div className="requirements-list">
            <div className={`requirement ${canStartManually ? 'met' : 'unmet'}`}>
              <div className="indicator"></div>
              <span>Minimum 2 players ({playerCount}/2)</span>
            </div>
            {settings.isTeamGame && (
              <>
                <div className={`requirement ${team1Players.length >= 1 ? 'met' : 'unmet'}`}>
                  <div className="indicator"></div>
                  <span>Team {settings.teamNames?.[0]} has players ({team1Players.length})</span>
                </div>
                <div className={`requirement ${team2Players.length >= 1 ? 'met' : 'unmet'}`}>
                  <div className="indicator"></div>
                  <span>Team {settings.teamNames?.[1]} has players ({team2Players.length})</span>
                </div>
              </>
            )}
          </div>
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

          {isJoining && (
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