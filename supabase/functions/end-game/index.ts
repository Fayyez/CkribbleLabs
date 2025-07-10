import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from "../__shared_data/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type RequestBody = {
  roomId: string;
  winner?: string;
  winnerType?: 'individual' | 'team';
  finalScores: Record<string, number>;
  teamScores?: Record<string, {
    totalScore: number;
    averageScore: number;
    playerCount: number;
    players: Array<{ id: string; name: string; score: number }>;
  }>;
  isTeamGame?: boolean;
  reason: 'completed' | 'insufficient_players' | 'host_ended' | 'team_insufficient';
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
      winnerType = 'individual',
      finalScores,
      teamScores = {},
      isTeamGame = false,
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
    let actualWinnerType = winnerType;
    
    if (!actualWinner) {
      if (isTeamGame && teamScores && Object.keys(teamScores).length > 0) {
        // Find winning team
        const sortedTeams = Object.entries(teamScores).sort(([,a], [,b]) => b.totalScore - a.totalScore);
        actualWinner = sortedTeams[0]?.[0] || null;
        actualWinnerType = 'team';
      } else {
        // Find individual winner
        const sortedPlayers = Object.entries(finalScores).sort(([,a], [,b]) => b - a);
        actualWinner = sortedPlayers[0]?.[0] || null;
        actualWinnerType = 'individual';
      }
    }

    const gameEndData = {
      winner: actualWinner,
      winnerType: actualWinnerType,
      finalScores,
      teamScores,
      isTeamGame,
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
      winnerType: actualWinnerType,
      isTeamGame,
      reason,
      playerCount: Object.keys(finalScores).length,
      teamCount: Object.keys(teamScores).length
    });

    // Create descriptive message based on game type and reason
    let message = `Game ended: ${reason}`;
    if (actualWinner && reason === 'completed') {
      if (actualWinnerType === 'team') {
        message = `Game completed! Team ${actualWinner} wins!`;
      } else {
        message = `Game completed! ${actualWinner} wins!`;
      }
    } else if (reason === 'team_insufficient') {
      message = `Game ended: Not enough teams remaining`;
    } else if (reason === 'insufficient_players') {
      message = `Game ended: Not enough players remaining`;
    }

    return new Response(JSON.stringify({
      success: true,
      ...gameEndData,
      message
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