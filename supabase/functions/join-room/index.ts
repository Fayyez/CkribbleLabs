import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from "../__shared_data/cors.ts";

type RequestBody = {
  roomId: string;
  playerId: string;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { roomId, playerId }: RequestBody = await req.json();

    if (!roomId || !playerId) {
      return new Response(
        JSON.stringify({ error: "Missing roomId or playerId" }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate room code format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(roomId)) {
      return new Response(
        JSON.stringify({ error: "Invalid room code format" }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // In a real implementation, you would check if the room exists
    // and is active in a database or cache. For now, we'll assume
    // any valid UUID is a valid room.
    
    const roomData = {
      roomId,
      isActive: true,
      maxPlayers: 22,
      status: "waiting"
    };

    return new Response(
      JSON.stringify({ 
        success: true,
        room: roomData,
        message: "Room found and ready to join"
      }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error("join-room error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 