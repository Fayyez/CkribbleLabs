import { serve } from "https://deno.land/std/http/server.ts";

type EndRoundRequest = {// expected input
  roomId: string;
  drawerId: string;
  correctGuessers: { id: string; timeTaken: number }[];
  allPlayers: string[];       // full original player list
  activePlayers: string[];    // players still in game
  currentTurn: number;        // global turn index (1-based)
  currentRound: number;
  roundsTotal: number;
  isTeamGame: boolean;
  teamMap?: Record<string, string>; // { userId: "Red" }, required if isTeamGame
  previousScores: Record<string, number>;
  drawingTime?: number;
};


function computeGuesserScore(timeTaken: number, totalTime: number): number {
  const base = 50;
  const bonus = Math.round(((totalTime - timeTaken) / totalTime) * 50);
  return base + bonus;
}

function computeDrawerScore(guessers: { id: string; timeTaken: number }[]): number {
  const basePoints = guessers.length * 20;
  const fastGuesses = guessers.filter(g => g.timeTaken <= 10).length;
  const bonus = fastGuesses * 10;
  return basePoints + bonus;
}

function checkTeamedGamePlayable(activePlayers: string[], teamMap: Record<string, string>): boolean {
  const teamCounts: Record<string, number> = {};
  for (const p of activePlayers) {
    const team = teamMap[p];
    if (team) teamCounts[team] = (teamCounts[team] || 0) + 1;
  }
  return Object.values(teamCounts).filter(c => c > 0).length >= 2;
}

serve(async (req) => {
  try {
    const {
      roomId,
      drawerId,
      correctGuessers,
      allPlayers,
      activePlayers,
      currentTurn,
      currentRound,
      roundsTotal,
      isTeamGame,
      teamMap,
      previousScores,
      drawingTime = 60
    }: EndRoundRequest = await req.json();

    const newScores = { ...previousScores };

    for (const g of correctGuessers) {
      const score = computeGuesserScore(g.timeTaken, drawingTime);
      newScores[g.id] = (newScores[g.id] || 0) + score;
    }

    if (activePlayers.includes(drawerId)) {
      const drawerScore = computeDrawerScore(correctGuessers);
      newScores[drawerId] = (newScores[drawerId] || 0) + drawerScore;
    }

    // Recalculate state
    const nextTurn = currentTurn + 1;
    const turnsPerRound = activePlayers.length;
    const totalTurns = roundsTotal * turnsPerRound;
    const gameOver =
      activePlayers.length < 2 ||
      nextTurn > totalTurns ||
      (isTeamGame && (!teamMap || !checkTeamedGamePlayable(activePlayers, teamMap)));

    if (gameOver) {
      return new Response(JSON.stringify({
        gameOver: true,
        leaderboard: newScores,
        reason: activePlayers.length < 2
          ? "Not enough players"
          : nextTurn > totalTurns
            ? "All turns completed"
            : "A team has no players left"
      }), { status: 200 });
    }

    const newRound = Math.floor((nextTurn - 1) / turnsPerRound) + 1;
    const nextDrawerId = activePlayers[nextTurn % activePlayers.length];

    return new Response(JSON.stringify({
      gameOver: false,
      leaderboard: newScores,
      nextDrawerId,
      currentTurn: nextTurn,
      currentRound: newRound
    }), { status: 200 });

  } catch (err) {
    console.error("end-round error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
});
