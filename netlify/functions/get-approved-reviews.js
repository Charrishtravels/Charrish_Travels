import { getSupabaseClient, jsonResponse } from './_supabase.js';

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('id, name, rating, message, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    // TEMP: surfacing real error for setup debugging — revert to a generic
    // message once the Supabase connection is confirmed working.
    return jsonResponse(500, { error: 'Could not load reviews', detail: error.message, code: error.code });
  }

  return jsonResponse(200, { reviews: data });
}
