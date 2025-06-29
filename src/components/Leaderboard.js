import React from 'react';
import { useSelector } from 'react-redux';

const Leaderboard = () => {
  const { scores, leaderboard } = useSelector(state => state.game);
  const { players } = useSelector(state => state.room);
  const { settings } = useSelector(state => state.room);

  const getPlayerInfo = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player || { displayName: 'Unknown', avatarUrl: '🤷', team: null };
  };

  const getTeamColor = (team) => {
    if (!team || !settings.isTeamGame) return null;
    return team === settings.teamNames[0] ? '#ff4444' : '#4444ff';
  };

  // Create properly ranked leaderboard with correct tie handling
  const rankedLeaderboard = React.useMemo(() => {
    // Sort players by score (descending)
    const sortedPlayers = [...players]
      .map(player => ({
        ...player,
        score: scores[player.id] || 0
      }))
      .sort((a, b) => b.score - a.score);

    // Calculate ranks with proper tie handling
    const rankedList = [];
    let currentRank = 1;

    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      
      // If this isn't the first player and the score is different from previous player
      if (i > 0 && player.score !== sortedPlayers[i - 1].score) {
        currentRank = i + 1; // Jump to the next available rank
      }
      
      rankedList.push({
        ...player,
        rank: currentRank
      });
    }

    return rankedList;
  }, [players, scores]);

  return (
    <div className="leaderboard-compact">
      <div className="leaderboard-header">
        <h4>🏆 Leaderboard</h4>
      </div>
      
      <div className="scores-list-compact">
        {rankedLeaderboard.map((player) => {
          const teamColor = getTeamColor(player.team);
          
          return (
            <div
              key={player.id}
              className="score-item-compact"
              style={teamColor ? { borderLeft: `3px solid ${teamColor}` } : {}}
            >
              <div className="rank-compact">#{player.rank}</div>
              <div className="player-info-compact">
                <span className="avatar-compact">
                  {player.avatarUrl && !player.avatarUrl.includes('🤷') ? (
                    <img 
                      src={player.avatarUrl} 
                      alt={player.displayName}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'inline';
                      }}
                    />
                  ) : null}
                  <span style={player.avatarUrl && !player.avatarUrl.includes('🤷') ? { display: 'none' } : {}}>
                    🤷
                  </span>
                </span>
                <div className="name-score-compact">
                  <span className="name-compact">{player.displayName}</span>
                  {settings.isTeamGame && player.team && (
                    <span className="team-compact" style={{ color: teamColor }}>
                      {player.team}
                    </span>
                  )}
                </div>
              </div>
              <div className="score-compact">{player.score || 0}</div>
            </div>
          );
        })}
      </div>
      
      {settings.isTeamGame && (
        <div className="team-scores-compact">
          <h5>Teams</h5>
          {settings.teamNames.map((teamName, index) => {
            const teamPlayers = players.filter(p => p.team === teamName);
            const teamScore = teamPlayers.reduce((sum, player) => 
              sum + (scores[player.id] || 0), 0
            );
            const avgScore = teamPlayers.length > 0 ? 
              Math.round(teamScore / teamPlayers.length) : 0;
            
            return (
              <div
                key={teamName}
                className="team-score-compact"
                style={{ color: getTeamColor(teamName) }}
              >
                <span className="team-name-compact">{teamName}</span>
                <span className="team-stats-compact">{teamScore} ({avgScore})</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Compact CSS Styles */}
      <style jsx>{`
        .leaderboard-compact {
          height: 100%;
          display: flex;
          flex-direction: column;
          font-size: 12px;
        }

        .leaderboard-header {
          padding: 8px 12px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }

        .leaderboard-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .scores-list-compact {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .score-item-compact {
          display: flex;
          align-items: center;
          padding: 6px 8px;
          margin-bottom: 4px;
          background: #f8f9fa;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }

        .rank-compact {
          font-weight: bold;
          font-size: 11px;
          color: #495057;
          min-width: 20px;
        }

        .player-info-compact {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0 8px;
        }

        .avatar-compact {
          display: flex;
          align-items: center;
        }

        .name-score-compact {
          flex: 1;
          min-width: 0;
        }

        .name-compact {
          display: block;
          font-weight: 500;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .team-compact {
          display: block;
          font-size: 9px;
          font-weight: 400;
        }

        .score-compact {
          font-weight: bold;
          font-size: 12px;
          color: #007bff;
          min-width: 25px;
          text-align: right;
        }

        .team-scores-compact {
          padding: 8px 12px;
          border-top: 1px solid #e9ecef;
          background: #f8f9fa;
        }

        .team-scores-compact h5 {
          margin: 0 0 6px 0;
          font-size: 12px;
          font-weight: 600;
        }

        .team-score-compact {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3px 0;
          font-size: 11px;
        }

        .team-name-compact {
          font-weight: 500;
        }

        .team-stats-compact {
          font-size: 10px;
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;
