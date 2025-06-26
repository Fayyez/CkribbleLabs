// sample input
type EndGameRequest = {
  roomId: string;
  leaderboard: Record<string, number>; // { userId: score }
  isTeamGame: boolean;
  teamMap?: Record<string, string>; // { userId: "Red" }
};

// function:

const maxScore = Math.max(...Object.values(leaderboard));
const winners = Object.entries(leaderboard)
  .filter(([_, score]) => score === maxScore)
  .map(([userId]) => userId);

const teamScores: Record<string, { total: number; count: number }> = {};
for (const [userId, score] of Object.entries(leaderboard)) {
  const team = teamMap[userId];
  if (!team) continue;
  if (!teamScores[team]) teamScores[team] = { total: 0, count: 0 };
  teamScores[team].total += score;
  teamScores[team].count++;
}

const teamAverages = Object.fromEntries(
  Object.entries(teamScores).map(([team, { total, count }]) => [
    team,
    total / count,
  ])
);

const winningTeam = Object.entries(teamAverages).sort(
  (a, b) => b[1] - a[1]
)[0]?.[0];

import { serve } from "https://deno.land/std/http/server.ts";

type Leaderboard = Record<string, number>;
type TeamMap = Record<string, string>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      },
    });
  }

  try {
    const { roomId, leaderboard, isTeamGame, teamMap } = await req.json();

    if (!leaderboard || Object.keys(leaderboard).length === 0) {
      return new Response(JSON.stringify({ error: "Leaderboard is empty" }), {
        status: 400,
      });
    }

    // Determine individual winners
    const maxScore = Math.max(...Object.values(leaderboard));
    const winners = Object.entries(leaderboard)
      .filter(([_, score]) => score === maxScore)
      .map(([userId]) => userId);

    let winningTeam: string | undefined = undefined;

    if (isTeamGame && teamMap) {
      const teamScores: Record<string, { total: number; count: number }> = {};

      for (const [userId, score] of Object.entries(leaderboard)) {
        const team = teamMap[userId];
        if (!team) continue;
        if (!teamScores[team]) teamScores[team] = { total: 0, count: 0 };
        teamScores[team].total += score;
        teamScores[team].count++;
      }

      const teamAverages = Object.fromEntries(
        Object.entries(teamScores).map(([team, { total, count }]) => [
          team,
          total / count,
        ])
      );

      winningTeam = Object.entries(teamAverages).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0];
    }

    return new Response(
      JSON.stringify({
        gameOver: true,
        winners,
        winningTeam,
        leaderboard,
      }),
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        }
      }
    );
  } catch (err) {
    console.error("end-game error:", err);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
});