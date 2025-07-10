import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../__shared_data/cors.ts";
import { cleanupOldRooms } from "../__shared_data/room-cleanup.ts";

type Player = {
  id: string;
  displayName: string;
  avatarUrl: string;
  team?: string | null;
  joinedAt: string;
  isCreator: boolean;
};

type RoomState = {
  roomId: string;
  hostId: string | null;
  players: Player[];
  settings: any;
  isActive: boolean;
  maxPlayers: number;
  status: string;
  createdAt: string;
  lastActivity: string;
};

type RequestBody = {
  roomId: string;
  playerId: string;
  playerData?: Player;
  action?: 'join' | 'leave' | 'get-state';
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Periodic cleanup of old rooms (non-blocking)
    cleanupOldRooms().catch(err => console.error('Cleanup error:', err));

    const { roomId, playerId, playerData, action = 'join' }: RequestBody = await req.json();

    if (!roomId || !playerId) {
      return new Response(
        JSON.stringify({ error: "Missing roomId or playerId" }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    const now = new Date().toISOString();

    // Get or create room from database
    let { data: existingRoom, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Database fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: "Database error" }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let room: RoomState;

    if (!existingRoom) {
      // Create new room
      room = {
        roomId,
        hostId: null,
        players: [],
        settings: {
          rounds: 3,
          drawingTime: 80,
          maxWordLength: 15,
          theme: 'default',
          isThemedGame: false,
          isTeamGame: false,
          teamNames: ['Red', 'Blue'],
        },
        isActive: true,
        maxPlayers: 22,
        status: "waiting",
        createdAt: now,
        lastActivity: now
      };

      // Insert new room into database
      const { error: insertError } = await supabase
        .from('rooms')
        .insert({
          room_id: roomId,
          host_id: null,
          players: [],
          settings: room.settings,
          is_active: true,
          max_players: 22,
          status: 'waiting',
          created_at: now,
          last_activity: now
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create room" }), 
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log(`Created new room: ${roomId}`);
    } else {
      // Convert database format to our format
      room = {
        roomId: existingRoom.room_id,
        hostId: existingRoom.host_id,
        players: existingRoom.players || [],
        settings: existingRoom.settings,
        isActive: existingRoom.is_active,
        maxPlayers: existingRoom.max_players,
        status: existingRoom.status,
        createdAt: existingRoom.created_at,
        lastActivity: existingRoom.last_activity
      };
    }

    // Perform action on room state
    switch (action) {
      case 'join':
        if (playerData) {
          // Remove existing player if they're rejoining (prevent duplicates)
          room.players = room.players.filter(p => p.id !== playerId);
          
          // Set as host if first player
          if (room.players.length === 0) {
            room.hostId = playerId;
            playerData.isCreator = true;
          }
          
          // Add player to room
          const newPlayer = {
            ...playerData,
            joinedAt: now
          };
          room.players.push(newPlayer);
          
          console.log(`Player ${playerId} joined room ${roomId}. Total players: ${room.players.length}`);
        }
        break;
        
      case 'leave':
        const playerCountBefore = room.players.length;
        room.players = room.players.filter(p => p.id !== playerId);
        console.log(`Player ${playerId} left room ${roomId}. Players: ${playerCountBefore} -> ${room.players.length}`);
        
        // If room is now empty, delete it
        if (room.players.length === 0) {
          console.log(`Room ${roomId} is empty, deleting...`);
          const { error: deleteError } = await supabase
            .from('rooms')
            .delete()
            .eq('room_id', roomId);
            
          if (deleteError) {
            console.error('Error deleting empty room:', deleteError);
          } else {
            console.log(`Successfully deleted empty room ${roomId}`);
          }
          
          return new Response(
            JSON.stringify({ 
              success: true,
              roomDeleted: true,
              message: "Room deleted - no players remaining"
            }), 
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        // If host left, assign new host
        if (room.hostId === playerId && room.players.length > 0) {
          room.hostId = room.players[0].id;
          room.players[0].isCreator = true;
          console.log(`New host assigned: ${room.hostId}`);
        }
        break;
        
      case 'get-state':
      default:
        // Just return current state
        console.log(`Returning state for room ${roomId}. Players: ${room.players.length}`);
        break;
    }

    // Update room in database
    room.lastActivity = now;
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        host_id: room.hostId,
        players: room.players,
        settings: room.settings,
        is_active: room.isActive,
        status: room.status,
        last_activity: room.lastActivity
      })
      .eq('room_id', roomId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update room" }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        room: {
          roomId: room.roomId,
          hostId: room.hostId,
          players: room.players,
          settings: room.settings,
          isActive: room.isActive,
          maxPlayers: room.maxPlayers,
          status: room.status
        },
        message: action === 'join' ? "Successfully joined room" : "Room state retrieved"
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