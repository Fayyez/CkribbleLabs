import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from "../__shared_data/cors.ts";

type RoomSettings = {
  rounds: number;
  maxWordLength: number;
  theme?: string;
  isThemedGame: boolean;
  isTeamGame: boolean;
  teamNames?: string[];
};

type RequestBody = {
  hostId: string;
  settings: RoomSettings;
};

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
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins from now

    const room = {
      roomId,
      hostId,
      settings,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

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
