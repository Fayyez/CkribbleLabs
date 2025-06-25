
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase, callEdgeFunction } from '../lib/supabase';
import { addPlayer, removePlayer, setPlayers } from '../redux/slices/roomSlice';
import { startGame } from '../redux/slices/gameSlice';

const WaitingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user, profile } = useSelector(state => state.auth);
  const { players, hostId, settings } = useSelector(state => state.room);
  
  const [timeUntilAutoStart, setTimeUntilAutoStart] = useState(300); // 5 minutes
  const [isStarting, setIsStarting] = useState(false);

  const isHost = user?.id === hostId;
  const canStartManually = players.length >= 2;
  const canStartTeamed = !settings.isTeamGame || (
    settings.teamNames.every(team => 
      players.some(p => p.team === team)
    )
  );

  // Auto-start timer
  useEffect(() => {
    if (timeUntilAutoStart <= 0) {
      handleStartGame();
      return;
    }

    const timer = setInterval(() => {
      setTimeUntilAutoStart(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeUntilAutoStart]);

  // Real-time player updates
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`room:${roomId}`);
    
    channel
      .on('broadcast', { event: 'player:join' }, (payload) => {
        dispatch(addPlayer(payload.player));
      })
      .on('broadcast', { event: 'player:leave' }, (payload) => {
        dispatch(removePlayer(payload.playerId));
      })
      .on('broadcast', { event: 'game:starting' }, () => {
        navigate(`/room/${roomId}/game`);
      })
      .subscribe();

    // Join the room
    const joinRoom = async () => {
      try {
        const playerData = {
          id: user.id,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          team: settings.isTeamGame ? settings.teamNames[0] : null,
        };

        channel.send({
          type: 'broadcast',
          event: 'player:join',
          payload: { player: playerData }
        });
      } catch (error) {
        console.error('Error joining room:', error);
      }
    };

    joinRoom();

    return () => {
      // Leave room
      channel.send({
        type: 'broadcast',
        event: 'player:leave',
        payload: { playerId: user.id }
      });
      
      supabase.removeChannel(channel);
    };
  }, [roomId, user?.id, profile, settings, navigate, dispatch]);

  const handleStartGame = async () => {
    if (!isHost || !canStartManually || !canStartTeamed || isStarting) return;
    
    setIsStarting(true);
    
    try {
      const response = await callEdgeFunction('start-game', {
        roomId,
        hostId: user.id,
        players,
        settings
      });

      // Broadcast game start
      const channel = supabase.channel(`room:${roomId}`);
      channel.send({
        type: 'broadcast',
        event: 'game:starting',
        payload: response
      });

      navigate(`/room/${roomId}/game`);
    } catch (error) {
      console.error('Error starting game:', error);
      setIsStarting(false);
    }
  };

  const handleTeamSelect = (team) => {
    // Update player's team
    const channel = supabase.channel(`room:${roomId}`);
    channel.send({
      type: 'broadcast',
      event: 'player:team-change',
      payload: { 
        playerId: user.id,
        team 
      }
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="waiting-room">
      <div className="waiting-room-header">
        <h1>Waiting Room</h1>
        <div className="room-code">
          Room Code: <strong>{roomId}</strong>
        </div>
        <div className="auto-start-timer">
          Auto-start in: {formatTime(timeUntilAutoStart)}
        </div>
      </div>

      <div className="room-settings">
        <h3>Game Settings</h3>
        <div className="settings-grid">
          <div className="setting-item">
            <span className="label">Rounds:</span>
            <span className="value">{settings.rounds}</span>
          </div>
          <div className="setting-item">
            <span className="label">Theme:</span>
            <span className="value">
              {settings.isThemedGame ? settings.theme : 'Mixed'}
            </span>
          </div>
          <div className="setting-item">
            <span className="label">Mode:</span>
            <span className="value">
              {settings.isTeamGame ? 'Team Game' : 'Individual'}
            </span>
          </div>
        </div>
      </div>

      {settings.isTeamGame && (
        <div className="team-selection">
          <h3>Select Your Team</h3>
          <div className="team-buttons">
            {settings.teamNames.map((team, index) => (
              <button
                key={team}
                className={`team-btn ${players.find(p => p.id === user?.id)?.team === team ? 'selected' : ''}`}
                onClick={() => handleTeamSelect(team)}
                style={{ 
                  backgroundColor: index === 0 ? '#ff4444' : '#4444ff',
                  color: 'white'
                }}
              >
                {team}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="players-section">
        <h3>Players ({players.length}/22)</h3>
        
        {settings.isTeamGame ? (
          <div className="team-players">
            {settings.teamNames.map((teamName, index) => (
              <div key={teamName} className="team-group">
                <h4 style={{ color: index === 0 ? '#ff4444' : '#4444ff' }}>
                  {teamName} ({players.filter(p => p.team === teamName).length})
                </h4>
                <div className="players-list">
                  {players
                    .filter(p => p.team === teamName)
                    .map(player => (
                      <div key={player.id} className="player-card">
                        <span className="player-avatar">{player.avatarUrl}</span>
                        <span className="player-name">{player.displayName}</span>
                        {player.id === hostId && (
                          <span className="host-badge">Host</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="players-list">
            {players.map(player => (
              <div key={player.id} className="player-card">
                <span className="player-avatar">{player.avatarUrl}</span>
                <span className="player-name">{player.displayName}</span>
                {player.id === hostId && (
                  <span className="host-badge">Host</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="waiting-room-actions">
        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={!canStartManually || !canStartTeamed || isStarting}
            className="btn-primary btn-large"
          >
            {isStarting ? 'Starting...' : 'Start Game Now'}
          </button>
        )}
        
        {!canStartManually && (
          <p className="start-requirement">
            Need at least 2 players to start
          </p>
        )}
        
        {!canStartTeamed && settings.isTeamGame && (
          <p className="start-requirement">
            Each team needs at least one player
          </p>
        )}
      </div>
    </div>
  );
};

export default WaitingRoom;
