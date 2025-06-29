import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from "../__shared_data/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type RequestBody = {
  roomId: string;
  drawerId: string;
  selectedWord?: string;
  roundNumber: number;
  turnIndex: number;
  turnOrder: string[];
  usedWords: string[];
  drawingTime?: number;
  theme?: string;
  action: 'generate_words' | 'start_round';
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Load word bank
async function loadWordBank(theme: string = 'default'): Promise<string[]> {
  try {
    const path = `../__shared_data/wordbank/${theme}.json`;
    const file = await Deno.readTextFile(path);
    return JSON.parse(file);
  } catch (error) {
    console.error(`Failed to load wordbank for theme: ${theme}`, error);
    // Fallback to default
    try {
      const fallbackPath = `../__shared_data/wordbank/default.json`;
      const fallbackFile = await Deno.readTextFile(fallbackPath);
      return JSON.parse(fallbackFile);
    } catch (fallbackError) {
      // Ultimate fallback
      return [
        'cat', 'dog', 'house', 'tree', 'car', 'book', 'phone', 'computer',
        'chair', 'table', 'bird', 'flower', 'sun', 'moon', 'star', 'fish'
      ];
    }
  }
}

// Generate word options
function generateWordOptions(wordBank: string[], usedWords: string[], count: number = 3): string[] {
  const availableWords = wordBank.filter(word => !usedWords.includes(word.toLowerCase()));
  
  if (availableWords.length < count) {
    // If we don't have enough unused words, include some used ones
    const shuffled = [...wordBank].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  
  // Shuffle and return the requested count
  const shuffled = availableWords.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Get next drawer in sequence
function getNextDrawer(turnOrder: string[], currentTurnIndex: number): {
  nextDrawerId: string;
  nextTurnIndex: number;
  isNewRound: boolean;
} {
  const nextIndex = (currentTurnIndex + 1) % turnOrder.length;
  const isNewRound = nextIndex === 0 && currentTurnIndex !== -1;
  
  return {
    nextDrawerId: turnOrder[nextIndex],
    nextTurnIndex: nextIndex,
    isNewRound
  };
}

// Update room status
async function updateRoomGameState(roomId: string, gameState: any) {
  try {
    const { error } = await supabase
      .from('rooms')
      .update({ 
        status: 'in_game',
        last_activity: new Date().toISOString()
      })
      .eq('room_id', roomId);

    if (error) {
      console.error('Failed to update room game state:', error);
    }
  } catch (error) {
    console.error('Database update error:', error);
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
    const requestBody: RequestBody = await req.json();
    console.log('📥 start-round request body:', requestBody);

    const {
      roomId,
      drawerId,
      selectedWord,
      roundNumber = 1,
      turnIndex = 0,
      turnOrder = [],
      usedWords = [],
      drawingTime = 60,
      theme = 'default',
      action
    } = requestBody;

    // Enhanced validation with better error messages
    if (!roomId) {
      console.error('❌ Missing roomId');
      return new Response(JSON.stringify({ error: "Missing roomId" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!drawerId) {
      console.error('❌ Missing drawerId');
      return new Response(JSON.stringify({ error: "Missing drawerId" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!action) {
      console.error('❌ Missing action');
      return new Response(JSON.stringify({ error: "Missing action" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (turnOrder.length === 0) {
      console.error('❌ Empty turnOrder');
      return new Response(JSON.stringify({ error: "Empty turnOrder" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Validation passed, loading word bank for theme:', theme);
    const wordBank = await loadWordBank(theme);

    if (action === 'generate_words') {
      console.log('🎲 Generating word options');
      // Generate word options for the drawer
      const wordOptions = generateWordOptions(wordBank, usedWords, 3);
      
      const response = {
        wordOptions,
        drawerId,
        roundNumber,
        turnIndex,
        success: true
      };

      console.log('📤 Returning word options:', response);
      
      return new Response(JSON.stringify(response), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'start_round') {
      if (!selectedWord) {
        console.error('❌ Missing selectedWord for start_round action');
        return new Response(JSON.stringify({ error: "Missing selectedWord for start_round action" }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('🚀 Starting round with selected word:', selectedWord);
      // Start the actual round with the selected word
      const newUsedWords = [...usedWords, selectedWord.toLowerCase()];
      
      // Update room status to in_game
      await updateRoomGameState(roomId, {
        currentWord: selectedWord,
        status: 'in_game',
        roundStartTime: Date.now()
      });

      const response = {
        round: roundNumber,
        drawerId,
        selectedWord,
        wordLength: selectedWord.length,
        drawingTime,
        usedWords: newUsedWords,
        turnIndex,
        turnOrder,
        isRoundActive: true,
        success: true,
        timestamp: Date.now()
      };

      console.log('📤 Returning start round response:', response);

      return new Response(JSON.stringify(response), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.error('❌ Invalid action:', action);
    return new Response(JSON.stringify({ error: `Invalid action: ${action}` }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("❌ start-round error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: err.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});