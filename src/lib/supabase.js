import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Edge Functions helper
export const callEdgeFunction = async (functionName, payload) => {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload
  });

  if (error) throw error;
  return data;
};

// Helper function to fetch user profile from database
export const fetchUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, avatar_url, email')
    .eq('id', userId)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error;
  }
  
  return data;
};

// Helper function to create user entry in database
export const createUserProfile = async (user) => {
  const emailPrefix = user.email?.split('@')[0] || 'User';
  const defaultAvatarUrl = 'https://cqrfgtidwzgvrhxcigth.supabase.co/storage/v1/object/public/avatars/default-pfp.jpg';
  
  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        id: user.id,
        display_name: user.user_metadata?.full_name || emailPrefix,
        avatar_url: user.user_metadata?.avatar_url || defaultAvatarUrl,
        email: user.email
      }
    ])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// Helper function to get or create user profile
export const getOrCreateUserProfile = async (user) => {
  try {
    // First try to fetch existing profile
    let profile = await fetchUserProfile(user.id);
    
    // If no profile exists, create one
    if (!profile) {
      profile = await createUserProfile(user);
    }
    
    return profile;
  } catch (error) {
    console.error('Error getting/creating user profile:', error);
    throw error;
  }
};
