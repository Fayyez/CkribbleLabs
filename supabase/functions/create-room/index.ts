import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from "../__shared_data/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type RoomSettings = {
  rounds: number;
  maxWordLength: number;
  theme?: string;
  isThemedGame: boolean;
  isTeamGame: boolean;
  teamNames?: string[];
  drawingTime: number;
};

type RequestBody = {
  hostId: string;
  settings: RoomSettings;
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { hostId, settings }: RequestBody = await req.json();

    if (!hostId) {
      return new Response(
        JSON.stringify({ error: "Missing hostId" }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const roomId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Store room in database for persistence
    const { error: insertError } = await supabase
      .from('rooms')
      .insert({
        room_id: roomId,
        host_id: hostId,
        players: [],
        settings: {
          rounds: settings.rounds,
          maxWordLength: settings.maxWordLength,
          theme: settings.theme || 'default',
          isThemedGame: settings.isThemedGame,
          isTeamGame: settings.isTeamGame,
          teamNames: settings.teamNames || ['Red', 'Blue'],
          drawingTime: settings.drawingTime,
        },
        is_active: true,
        max_players: 22,
        status: 'waiting',
        created_at: now,
        last_activity: now
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create room in database" }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const room = {
      roomId,
      hostId,
      settings: {
        rounds: settings.rounds,
        maxWordLength: settings.maxWordLength,
        theme: settings.theme || 'default',
        isThemedGame: settings.isThemedGame,
        isTeamGame: settings.isTeamGame,
        teamNames: settings.teamNames || ['Red', 'Blue'],
        drawingTime: settings.drawingTime,
      },
      createdAt: now,
      success: true
    };

    console.log(`Created room ${roomId} with settings:`, settings);

    return new Response(
      JSON.stringify(room), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error("create-room error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
