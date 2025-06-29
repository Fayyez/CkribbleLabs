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
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      <div className="scores-list">
        {rankedLeaderboard.map((player) => {
          const teamColor = getTeamColor(player.team);
          
          return (
            <div
              key={player.id}
              className="score-item"
              style={teamColor ? { borderLeft: `4px solid ${teamColor}` } : {}}
            >
              <div className="rank">#{player.rank}</div>
              <div className="player-info">
                <span className="avatar">{player.avatarUrl}</span>
                <span className="name">{player.displayName}</span>
                {settings.isTeamGame && player.team && (
                  <span className="team" style={{ color: teamColor }}>
                    {player.team}
                  </span>
                )}
              </div>
              <div className="score">{player.score || 0}</div>
            </div>
          );
        })}
      </div>
      
      {settings.isTeamGame && (
        <div className="team-scores">
          <h4>Team Standings</h4>
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
                className="team-score"
                style={{ color: getTeamColor(teamName) }}
              >
                <span className="team-name">{teamName}</span>
                <span className="team-avg">Avg: {avgScore}</span>
                <span className="team-total">Total: {teamScore}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
