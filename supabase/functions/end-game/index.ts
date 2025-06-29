import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from "../__shared_data/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type RequestBody = {
  roomId: string;
  winner?: string;
  finalScores: Record<string, number>;
  reason: 'completed' | 'insufficient_players' | 'host_ended';
  gameStats?: {
    totalRounds: number;
    totalTurns: number;
    gameDuration: number;
    playerCount: number;
  };
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Clean up room and related data
async function cleanupGameRoom(roomId: string) {
  try {
    console.log(`Cleaning up game room: ${roomId}`);
    
    // Delete the room from database
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('room_id', roomId);

    if (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
    
    console.log(`Successfully cleaned up room: ${roomId}`);
  } catch (error) {
    console.error('Failed to cleanup room:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const {
      roomId,
      winner,
      finalScores,
      reason,
      gameStats
    }: RequestBody = await req.json();

    if (!roomId || !finalScores) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine the actual winner from scores if not provided
    let actualWinner = winner;
    if (!actualWinner && finalScores) {
      const sortedPlayers = Object.entries(finalScores).sort(([,a], [,b]) => b - a);
      actualWinner = sortedPlayers[0]?.[0] || null;
    }

    const gameEndData = {
      winner: actualWinner,
      finalScores,
      reason,
      gameStats: gameStats || {},
      timestamp: Date.now(),
      endedAt: new Date().toISOString()
    };

    // Clean up the room from database
    await cleanupGameRoom(roomId);

    console.log('Game ended successfully:', {
      roomId,
      winner: actualWinner,
      reason,
      playerCount: Object.keys(finalScores).length
    });

    return new Response(JSON.stringify({
      success: true,
      ...gameEndData,
      message: `Game ended: ${reason}`
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("end-game error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});