import { getSupabaseClient, jsonResponse, getIdentityUser } from './_supabase.js';

export async function handler(event, context) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const user = getIdentityUser(context);
  if (!user) {
    return jsonResponse(401, { error: 'Login required' });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('id, name, rating, message, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    return jsonResponse(500, { error: 'Could not load pending reviews' });
  }

  return jsonResponse(200, { reviews: data });
}
