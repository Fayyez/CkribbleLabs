import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from "../__shared_data/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type PlayerScore = {
  playerId: string;
  points: number;
  timeTaken?: number;
  guessedCorrectly: boolean;
};

type RequestBody = {
  roomId: string;
  currentDrawerId: string;
  word: string;
  playerScores: PlayerScore[];
  currentRound: number;
  totalRounds: number;
  turnOrder: string[];
  currentTurnIndex: number;
  reason: 'timeout' | 'all_guessed' | 'manual';
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Calculate points for a correct guess
function calculateGuessPoints(timeTaken: number, maxTime: number = 60): number {
  const maxPoints = 100;
  const timeFactor = Math.max(0, (maxTime - timeTaken) / maxTime);
  return Math.round(maxPoints * timeFactor);
}

// Calculate drawing points based on how many players guessed correctly
function calculateDrawingPoints(correctGuessesCount: number, totalPlayers: number): number {
  if (totalPlayers <= 1) return 0;
  
  const maxDrawingPoints = 50;
  const ratio = correctGuessesCount / (totalPlayers - 1); // Exclude drawer
  return Math.round(maxDrawingPoints * ratio);
}

// Determine next drawer in sequence
function getNextDrawer(turnOrder: string[], currentTurnIndex: number, currentRound: number): {
  nextDrawerId: string;
  nextTurnIndex: number;
  nextRound: number;
  isNewRound: boolean;
} {
  const nextTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
  const isNewRound = nextTurnIndex === 0;
  const nextRound = isNewRound ? currentRound + 1 : currentRound;
  
  return {
    nextDrawerId: turnOrder[nextTurnIndex],
    nextTurnIndex,
    nextRound,
    isNewRound
  };
}

// Update room status in database
async function updateRoomStatus(roomId: string, status: string, isGameOver: boolean = false) {
  try {
    console.log(`Updating room ${roomId} status to ${status}`);
    
    const updateData: any = {
      status,
      last_activity: new Date().toISOString()
    };

    // If game is over, reset to waiting status
    if (isGameOver) {
      updateData.status = 'waiting';
    }

    const { error } = await supabase
      .from('rooms')
      .update(updateData)
      .eq('room_id', roomId);

    if (error) {
      console.error('Database update error:', error);
    } else {
      console.log('Room status updated successfully');
    }
  } catch (error) {
    console.error('Failed to update room status:', error);
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
      currentDrawerId,
      word,
      playerScores = [],
      currentRound,
      totalRounds,
      turnOrder,
      currentTurnIndex = 0,
      reason
    }: RequestBody = await req.json();

    if (!roomId || !currentDrawerId || !word || !turnOrder?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate final scores for this round
    const roundScores: Record<string, number> = {};
    const correctGuesses = playerScores.filter(score => score.guessedCorrectly);
    
    // Award points to guessers
    playerScores.forEach(playerScore => {
      if (playerScore.guessedCorrectly && playerScore.timeTaken !== undefined) {
        roundScores[playerScore.playerId] = calculateGuessPoints(playerScore.timeTaken);
      } else {
        roundScores[playerScore.playerId] = 0;
      }
    });

    // Award points to drawer based on how many guessed correctly
    const totalPlayers = turnOrder.length;
    const drawingPoints = calculateDrawingPoints(correctGuesses.length, totalPlayers);
    roundScores[currentDrawerId] = drawingPoints;

    // Determine next turn
    const nextTurn = getNextDrawer(turnOrder, currentTurnIndex, currentRound);
    
    // Check if game should end
    const isGameOver = nextTurn.nextRound > totalRounds;

    // Update room status
    if (isGameOver) {
      await updateRoomStatus(roomId, 'game_over', true);
    } else {
      await updateRoomStatus(roomId, 'active');
    }

    const response = {
      word,
      scores: roundScores,
      reason,
      nextDrawer: isGameOver ? null : nextTurn.nextDrawerId,
      nextTurnIndex: isGameOver ? null : nextTurn.nextTurnIndex,
      nextRound: nextTurn.nextRound,
      isNewRound: nextTurn.isNewRound,
      isGameOver,
      correctGuesses: correctGuesses.map(guess => ({
        playerId: guess.playerId,
        timeTaken: guess.timeTaken,
        points: roundScores[guess.playerId]
      })),
      drawerPoints: drawingPoints,
      timestamp: Date.now(),
      roundSummary: {
        totalGuesses: playerScores.length,
        correctGuesses: correctGuesses.length,
        averageTime: correctGuesses.length > 0 
          ? Math.round(correctGuesses.reduce((sum, g) => sum + (g.timeTaken || 0), 0) / correctGuesses.length)
          : 0
      },
      gameProgress: {
        currentRound,
        totalRounds,
        completedTurns: currentTurnIndex + 1,
        totalTurns: turnOrder.length * totalRounds
      }
    };

    console.log('Round end result:', {
      roomId,
      currentRound,
      nextRound: nextTurn.nextRound,
      nextDrawer: nextTurn.nextDrawerId,
      isGameOver,
      correctGuessesCount: correctGuesses.length
    });

    return new Response(JSON.stringify(response), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("end-round error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
