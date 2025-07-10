import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase, callEdgeFunction } from '../lib/supabase';
import { addPlayer, removePlayer, setPlayers, updatePlayer } from '../redux/slices/roomSlice';
import { startGame } from '../redux/slices/gameSlice';

const DEFAULT_AVATAR = 'https://cqrfgtidwzgvrhxcigth.supabase.co/storage/v1/object/public/avatars//default-pfp.jpg';

const WaitingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user, profile } = useSelector(state => state.auth);
  const { players, hostId, settings } = useSelector(state => state.room);
  
  const [timeUntilAutoStart, setTimeUntilAutoStart] = useState(300); // 5 minutes
  const [isStarting, setIsStarting] = useState(false);
  const [isJoining, setIsJoining] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [error, setError] = useState(null);
  const [channel, setChannel] = useState(null);
  const [autoStartActive, setAutoStartActive] = useState(false);

  const isHost = user?.id === hostId;
  const currentPlayer = players.find(p => p.id === user?.id);
  const canStartManually = players.length >= 2;
  const canStartTeamed = !settings.isTeamGame || (
    settings.teamNames.every(team => 
      players.some(p => p.team === team)
    )
  );
  const canAutoStart = canStartManually && canStartTeamed;

  // Debug logging
  const logDebug = useCallback((message, data = null) => {
    console.log(`[WaitingRoom Debug] ${message}`, data);
  }, []);

  const logError = useCallback((message, error = null) => {
    console.error(`[WaitingRoom Error] ${message}`, error);
    setError(message);
  }, []);

  // Auto-start timer - only when conditions are met
  useEffect(() => {
    if (!canAutoStart) {
      setAutoStartActive(false);
      setTimeUntilAutoStart(300);
      return;
    }

    if (!autoStartActive) {
      setAutoStartActive(true);
      logDebug('Auto-start timer activated', { canStartManually, canStartTeamed });
    }

    if (timeUntilAutoStart <= 0) {
      logDebug('Auto-start timer expired, starting game');
      handleStartGame();
      return;
    }

    const timer = setInterval(() => {
      setTimeUntilAutoStart(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeUntilAutoStart, canAutoStart, autoStartActive]);

  // Real-time player updates
  useEffect(() => {
    if (!roomId || !user) {
      logError('Missing roomId or user');
      return;
    }

    logDebug('Setting up real-time channel', { roomId, userId: user.id });

    const newChannel = supabase.channel(`room:${roomId}`);
    
    newChannel
      .on('broadcast', { event: 'player:join' }, (payload) => {
        logDebug('Player joined', payload);
        const player = {
          ...payload.player,
          avatarUrl: payload.player.avatarUrl || DEFAULT_AVATAR
        };
        dispatch(addPlayer(player));
      })
      .on('broadcast', { event: 'player:leave' }, (payload) => {
        logDebug('Player left', payload);
        dispatch(removePlayer(payload.playerId));
      })
      .on('broadcast', { event: 'player:team-change' }, (payload) => {
        logDebug('Player team changed', payload);
        dispatch(updatePlayer({ 
          playerId: payload.playerId, 
          updates: { team: payload.team } 
        }));
      })
      .on('broadcast', { event: 'game:starting' }, (payload) => {
        logDebug('Game starting', payload);
        navigate(`/room/${roomId}/game`);
      })
      .subscribe((status) => {
        logDebug('Channel subscription status', status);
        if (status === 'SUBSCRIBED') {
          joinRoom();
        }
      });

    setChannel(newChannel);

    return () => {
      logDebug('Cleaning up channel');
      if (newChannel) {
        newChannel.send({
          type: 'broadcast',
          event: 'player:leave',
          payload: { playerId: user.id }
        });
        supabase.removeChannel(newChannel);
      }
    };
  }, [roomId, user?.id]);

  const joinRoom = useCallback(async () => {
    if (!user || !profile || !channel) {
      logError('Cannot join room - missing user, profile, or channel');
      return;
    }

    try {
      setIsJoining(true);
      logDebug('Joining room', { userId: user.id, displayName: profile.displayName });

      const playerData = {
        id: user.id,
        displayName: profile.displayName || 'Anonymous',
        avatarUrl: profile.avatarUrl || DEFAULT_AVATAR,
        team: settings.isTeamGame ? null : null, // Will be set after team selection
      };

      // For team games, don't broadcast join until team is selected
      if (!settings.isTeamGame) {
        channel.send({
          type: 'broadcast',
          event: 'player:join',
          payload: { player: playerData }
        });
      }

      setIsJoining(false);
    } catch (error) {
      logError('Error joining room', error);
      setIsJoining(false);
    }
  }, [user, profile, channel, settings.isTeamGame]);

  const handleTeamSelect = useCallback((team) => {
    if (!channel || !user) return;

    try {
      logDebug('Player selecting team', { userId: user.id, team });

      setSelectedTeam(team);

      const playerData = {
        id: user.id,
        displayName: profile.displayName || 'Anonymous',
        avatarUrl: profile.avatarUrl || DEFAULT_AVATAR,
        team: team,
      };

      // Broadcast team selection and join
      channel.send({
        type: 'broadcast',
        event: 'player:join',
        payload: { player: playerData }
      });

      // Update local player data
      dispatch(updatePlayer({ 
        playerId: user.id, 
        updates: { team: team } 
      }));

    } catch (error) {
      logError('Error selecting team', error);
    }
  }, [channel, user, profile, dispatch]);

  const handleStartGame = async () => {
    if (!isHost || !canStartManually || !canStartTeamed || isStarting) {
      logDebug('Cannot start game', { isHost, canStartManually, canStartTeamed, isStarting });
      return;
    }
    
    setIsStarting(true);
    logDebug('Starting game', { roomId, players: players.length });
    
    try {
      const response = await callEdgeFunction('start-game', {
        roomId,
        hostId: user.id,
        players,
        settings
      });

      logDebug('Game start response', response);

      // Broadcast game start
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'game:starting',
          payload: response
        });
      }

      navigate(`/room/${roomId}/game`);
    } catch (error) {
      logError('Error starting game', error);
      setIsStarting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTeamColor = (index) => {
    return index === 0 ? '#ff4444' : '#4444ff';
  };

  if (error) {
    return (
      <div className="waiting-room" style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}>
        <div style={{ 
          background: 'white', 
          padding: 32, 
          borderRadius: 16, 
          textAlign: 'center',
          maxWidth: 400
        }}>
          <h2 style={{ color: '#e74c3c', marginBottom: 16 }}>Error</h2>
          <p style={{ marginBottom: 24 }}>{error}</p>
          <button 
            onClick={() => navigate('/')} 
            className="btn-primary"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="waiting-room" style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 24
    }}>
      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto',
        background: 'white',
        borderRadius: 20,
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(45deg, #ff6b6b, #feca57)',
          color: 'white',
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Waiting Room</h1>
            <div style={{ marginTop: 8 }}>
              Room Code: <strong style={{ fontSize: 18 }}>{roomId}</strong>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {autoStartActive && (
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                Auto-start in: {formatTime(timeUntilAutoStart)}
              </div>
            )}
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              {players.length}/22 players
            </div>
          </div>
        </div>

        <div style={{ padding: 32 }}>
          {/* Game Settings */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: 24, 
            borderRadius: 12, 
            marginBottom: 24 
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Game Settings</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 16 
            }}>
              <div>
                <span style={{ fontWeight: 600, color: '#666' }}>Rounds:</span>
                <span style={{ marginLeft: 8, fontWeight: 500 }}>{settings.rounds}</span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: '#666' }}>Drawing Time:</span>
                <span style={{ marginLeft: 8, fontWeight: 500 }}>{settings.drawingTime}s</span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: '#666' }}>Theme:</span>
                <span style={{ marginLeft: 8, fontWeight: 500 }}>
                  {settings.isThemedGame ? settings.theme : 'Mixed'}
                </span>
              </div>
              <div>
                <span style={{ fontWeight: 600, color: '#666' }}>Mode:</span>
                <span style={{ marginLeft: 8, fontWeight: 500 }}>
                  {settings.isTeamGame ? 'Team Game' : 'Individual'}
                </span>
              </div>
            </div>
          </div>

          {/* Team Selection for Team Games */}
          {settings.isTeamGame && !currentPlayer?.team && (
            <div style={{ 
              background: '#fff3cd', 
              border: '1px solid #ffeaa7', 
              padding: 24, 
              borderRadius: 12, 
              marginBottom: 24,
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#856404' }}>Select Your Team</h3>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                {settings.teamNames.map((team, index) => (
                  <button
                    key={team}
                    onClick={() => handleTeamSelect(team)}
                    style={{ 
                      background: getTeamColor(index),
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                      minWidth: 120
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Players Section */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>
              Players ({players.length}/22)
            </h3>
            
            {settings.isTeamGame ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                {settings.teamNames.map((teamName, index) => (
                  <div key={teamName} style={{ 
                    background: '#f8f9fa', 
                    padding: 20, 
                    borderRadius: 12,
                    border: `2px solid ${getTeamColor(index)}20`
                  }}>
                    <h4 style={{ 
                      color: getTeamColor(index), 
                      margin: '0 0 16px 0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      {teamName}
                      <span style={{ 
                        background: getTeamColor(index), 
                        color: 'white', 
                        padding: '4px 12px', 
                        borderRadius: 12,
                        fontSize: 14
                      }}>
                        {players.filter(p => p.team === teamName).length}
                      </span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {players
                        .filter(p => p.team === teamName)
                        .map(player => (
                          <div key={player.id} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 12,
                            padding: 8,
                            background: 'white',
                            borderRadius: 8
                          }}>
                            <img 
                              src={player.avatarUrl || DEFAULT_AVATAR} 
                              alt="avatar" 
                              style={{ 
                                width: 32, 
                                height: 32, 
                                borderRadius: '50%',
                                border: '2px solid #ddd'
                              }} 
                            />
                            <span style={{ fontWeight: 500, flex: 1 }}>
                              {player.displayName}
                            </span>
                            {player.id === hostId && (
                              <span style={{ 
                                background: '#ff6b6b', 
                                color: 'white', 
                                padding: '2px 8px', 
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 600
                              }}>
                                Host
                              </span>
                            )}
                          </div>
                        ))}
                      {players.filter(p => p.team === teamName).length === 0 && (
                        <div style={{ 
                          textAlign: 'center', 
                          color: '#999', 
                          fontStyle: 'italic',
                          padding: 16
                        }}>
                          No players yet
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: 16 
              }}>
                {players.map(player => (
                  <div key={player.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12,
                    padding: 16,
                    background: '#f8f9fa',
                    borderRadius: 12,
                    border: '1px solid #e9ecef'
                  }}>
                    <img 
                      src={player.avatarUrl || DEFAULT_AVATAR} 
                      alt="avatar" 
                      style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%',
                        border: '2px solid #ddd'
                      }} 
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#333' }}>
                        {player.displayName}
                      </div>
                      {player.id === hostId && (
                        <div style={{ 
                          color: '#ff6b6b', 
                          fontSize: 12, 
                          fontWeight: 600 
                        }}>
                          Host
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ textAlign: 'center' }}>
            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={!canStartManually || !canStartTeamed || isStarting}
                className="btn-primary btn-large"
                style={{ 
                  fontSize: 18, 
                  padding: '16px 32px',
                  marginBottom: 16
                }}
              >
                {isStarting ? 'Starting...' : 'Start Game Now'}
              </button>
            )}
            
            {!canStartManually && (
              <div style={{ 
                background: '#fff3cd', 
                color: '#856404', 
                padding: 16, 
                borderRadius: 8,
                marginBottom: 16
              }}>
                Need at least 2 players to start
              </div>
            )}
            
            {!canStartTeamed && settings.isTeamGame && (
              <div style={{ 
                background: '#fff3cd', 
                color: '#856404', 
                padding: 16, 
                borderRadius: 8,
                marginBottom: 16
              }}>
                Each team needs at least one player
              </div>
            )}

            {isJoining && (
              <div style={{ 
                background: '#d1ecf1', 
                color: '#0c5460', 
                padding: 16, 
                borderRadius: 8 
              }}>
                Joining room...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;
