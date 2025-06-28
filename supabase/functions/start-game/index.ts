import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from "../__shared_data/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type Player = {
  id: string;
  displayName: string;
  avatarUrl: string;
  team?: string;
};

type GameSettings = {
  rounds: number;
  drawingTime: number;
  isTeamGame: boolean;
  teamNames: string[];
  theme: string;
  isThemedGame: boolean;
  maxPlayers: number;
  maxWordLength?: number;
};

type RequestBody = {
  roomId: string;
  hostId: string;
  players: Player[];
  settings: GameSettings;
};

const WORD_BANK_PATH = "../__shared_data/wordbank";

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Load word bank with proper error handling
async function loadWordBank(theme: string = 'default'): Promise<string[]> {
  try {
    console.log(`Loading word bank for theme: ${theme}`);
    const path = `.${WORD_BANK_PATH}/${theme}.json`;
    const file = await Deno.readTextFile(path);
    const words = JSON.parse(file);
    console.log(`Successfully loaded ${words.length} words for theme: ${theme}`);
    return words;
  } catch (error) {
    console.error(`Failed to load wordbank for theme: ${theme}`, error);
    
    // Fallback to default theme if not already default
    if (theme !== 'default') {
      try {
        console.log('Attempting fallback to default theme');
        const fallbackPath = `.${WORD_BANK_PATH}/default.json`;
        const fallbackFile = await Deno.readTextFile(fallbackPath);
        const words = JSON.parse(fallbackFile);
        console.log(`Fallback successful: loaded ${words.length} words from default theme`);
        return words;
      } catch (fallbackError) {
        console.error('Fallback to default theme also failed', fallbackError);
      }
    }
    
    // Ultimate fallback - hardcoded words
    console.log('Using hardcoded fallback words');
    return [
      'cat', 'dog', 'house', 'tree', 'car', 'book', 'phone', 'computer',
      'chair', 'table', 'bird', 'flower', 'sun', 'moon', 'star', 'fish',
      'apple', 'banana', 'orange', 'pizza', 'burger', 'cake', 'cookie', 'ice cream'
    ];
  }
}

// Generate word options for the first drawer
function generateWordOptions(wordBank: string[], count: number = 3): string[] {
  if (wordBank.length === 0) {
    console.warn('Empty word bank, using fallback words');
    return ['cat', 'dog', 'house'];
  }
  
  const shuffled = [...wordBank].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, wordBank.length));
}

// Generate turn order - host goes first, then sequential
function generateTurnOrder(players: Player[], isTeamGame: boolean = false, hostId?: string): string[] {
  if (isTeamGame) {
    // For team games, alternate between teams
    const teams = players.reduce((acc, player) => {
      const team = player.team || 'Unknown';
      if (!acc[team]) acc[team] = [];
      acc[team].push(player.id);
      return acc;
    }, {} as Record<string, string[]>);
    
    const teamNames = Object.keys(teams);
    if (teamNames.length < 2) {
      console.warn('Not enough teams for team game, using player order');
      return players.map(p => p.id);
    }
    
    const turnOrder: string[] = [];
    const maxTeamSize = Math.max(...Object.values(teams).map(team => team.length));
    
    for (let i = 0; i < maxTeamSize; i++) {
      teamNames.forEach(teamName => {
        if (teams[teamName][i]) {
          turnOrder.push(teams[teamName][i]);
        }
      });
    }
    
    return turnOrder;
  } else {
    // For individual games, ensure host goes first, then others in order
    if (hostId) {
      const hostPlayer = players.find(p => p.id === hostId);
      const otherPlayers = players.filter(p => p.id !== hostId);
      
      if (hostPlayer) {
        return [hostPlayer.id, ...otherPlayers.map(p => p.id)];
      }
    }
    
    // Fallback: use the order players joined
    return players.map(p => p.id);
  }
}

// Update room status in database
async function updateRoomStatus(roomId: string, status: string, gameState: any) {
  try {
    console.log(`Updating room ${roomId} status to ${status}`);
    
    const { error } = await supabase
      .from('rooms')
      .update({ 
        status,
        settings: gameState.settings,
        last_activity: new Date().toISOString()
      })
      .eq('room_id', roomId);

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }
    
    console.log('Room status updated successfully');
  } catch (error) {
    console.error('Failed to update room status:', error);
    // Don't throw here - game can continue even if DB update fails
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
    console.log('Start game function called');
    
    const requestBody = await req.json();
    console.log('Request body received:', {
      roomId: requestBody.roomId,
      hostId: requestBody.hostId,
      playersCount: requestBody.players?.length,
      settings: requestBody.settings
    });

    const {
      roomId,
      hostId,
      players,
      settings
    }: RequestBody = requestBody;

    // Validate required fields
    if (!roomId || !hostId || !players?.length || !settings) {
      console.error('Missing required fields:', { 
        hasRoomId: !!roomId, 
        hasHostId: !!hostId, 
        hasPlayers: !!players?.length, 
        hasSettings: !!settings 
      });
      return new Response(JSON.stringify({ 
        error: "Missing required fields",
        details: {
          roomId: !!roomId,
          hostId: !!hostId,
          players: !!players?.length,
          settings: !!settings
        }
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate minimum players
    if (players.length < 2) {
      console.error('Not enough players:', players.length);
      return new Response(JSON.stringify({ error: "At least 2 players required" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate team game requirements
    if (settings.isTeamGame) {
      const teamCounts = players.reduce((acc, player) => {
        const team = player.team || 'Unknown';
        acc[team] = (acc[team] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const validTeams = Object.values(teamCounts).filter(count => count > 0);
      if (validTeams.length < 2) {
        console.error('Team game validation failed:', teamCounts);
        return new Response(JSON.stringify({ error: "Team game requires at least 2 teams with players" }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Load word bank and generate initial word options
    console.log('Loading word bank...');
    const theme = settings.isThemedGame ? settings.theme : 'default';
    const wordBank = await loadWordBank(theme);
    
    // Generate turn order (sequential based on player order)
    console.log('Generating turn order...');
    console.log('Players received:', players.map(p => ({ id: p.id, name: p.displayName })));
    console.log('Host ID:', hostId);
    const turnOrder = generateTurnOrder(players, settings.isTeamGame, hostId);
    console.log('Generated turn order:', turnOrder);
    const firstDrawer = turnOrder[0]; // Always start with first player in order
    console.log('First drawer assigned:', firstDrawer);
    console.log('First drawer name:', players.find(p => p.id === firstDrawer)?.displayName);
    
    // Generate word options for the first drawer
    console.log('Generating word options...');
    const wordOptions = generateWordOptions(wordBank, 3);
    console.log('Generated word options:', wordOptions);

    // Initialize game state
    console.log('Building game state...');
    const gameState = {
      roomId,
      gameId: `game_${Date.now()}`,
      hostId,
      isActive: true,
      currentRound: 1,
      currentTurn: 1,
      currentTurnIndex: 0, // Track position in turn order
      totalRounds: settings.rounds,
      drawerId: firstDrawer,
      turnOrder,
      wordOptions,
      usedWords: [],
      settings: {
        rounds: settings.rounds,
        drawingTime: settings.drawingTime,
        isTeamGame: settings.isTeamGame,
        teamNames: settings.teamNames || [],
        theme: theme,
        isThemedGame: settings.isThemedGame,
        maxPlayers: settings.maxPlayers || 22
      },
      players: players.map(player => ({
        ...player,
        isActive: true,
        score: 0
      })),
      scores: players.reduce((acc, player) => {
        acc[player.id] = 0;
        return acc;
      }, {} as Record<string, number>),
      gameStartTime: Date.now(),
      roundStartTime: null,
      currentWord: null,
      timeRemaining: settings.drawingTime,
      status: 'word_selection'
    };

    // Update room status in database
    await updateRoomStatus(roomId, 'active', gameState);

    const firstDrawerName = players.find(p => p.id === firstDrawer)?.displayName || 'Unknown';
    
    const response = {
      success: true,
      gameState,
      round: 1,
      nextDrawer: firstDrawer,
      wordOptions,
      turnOrder,
      message: `Game started! ${firstDrawerName} is first to draw.`,
      timestamp: Date.now()
    };

    console.log('Game start successful:', {
      roomId,
      playersCount: players.length,
      firstDrawer: firstDrawerName,
      wordOptionsCount: wordOptions.length,
      turnOrder: turnOrder
    });

    return new Response(JSON.stringify(response), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error("start-game error:", err);
    console.error("Error stack:", err.stack);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        details: err.message,
        timestamp: Date.now()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
