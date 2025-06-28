import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from "../__shared_data/cors.ts";

type Player = { id: string; team?: string };

type RequestBody = {
  roomId: string;
  hostId: string;
  players: Player[];
  settings: {
    rounds: number;
    theme?: string;
    isTeamGame: boolean;
    isThemedGame: boolean;
    teamNames?: string[];
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { roomId, hostId, players, settings }: RequestBody = await req.json();

    if (players.length < 2) {
      return new Response(JSON.stringify({ error: "Minimum 2 players required." }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (settings.isTeamGame) {
      const team1 = settings.teamNames?.[0];
      const team2 = settings.teamNames?.[1];
      const t1Count = players.filter(p => p.team === team1).length;
      const t2Count = players.filter(p => p.team === team2).length;

      if (!t1Count || !t2Count) {
        return new Response(JSON.stringify({ error: "Each team must have at least one player." }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Select initial drawer
    const drawer = players[Math.floor(Math.random() * players.length)];

    // Call get-random-words
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/get-random-words`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        theme: settings.theme || "default",
        count: 3,
        usedWords: []
      })
    });

    const { words } = await res.json();

    return new Response(JSON.stringify({
      success: true,
      round: 1,
      nextDrawer: drawer.id,
      wordOptions: words
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error("start-game error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
