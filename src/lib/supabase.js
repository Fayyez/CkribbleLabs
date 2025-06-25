
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
