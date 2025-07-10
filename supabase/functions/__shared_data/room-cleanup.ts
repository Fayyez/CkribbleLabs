import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function cleanupOldRooms() {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Delete rooms older than 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: oldRooms, error: selectError } = await supabase
      .from('rooms')
      .select('room_id')
      .lt('last_activity', twoHoursAgo);

    if (selectError) {
      console.error('Error selecting old rooms:', selectError);
      return;
    }

    if (oldRooms && oldRooms.length > 0) {
      const { error: deleteError } = await supabase
        .from('rooms')
        .delete()
        .lt('last_activity', twoHoursAgo);

      if (deleteError) {
        console.error('Error deleting old rooms:', deleteError);
      } else {
        console.log(`Cleaned up ${oldRooms.length} old rooms`);
      }
    }
  } catch (error) {
    console.error('Room cleanup error:', error);
  }
} 