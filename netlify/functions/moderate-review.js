import { getSupabaseClient, jsonResponse, getIdentityUser } from './_supabase.js';

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const user = getIdentityUser(context);
  if (!user) {
    return jsonResponse(401, { error: 'Login required' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const { id, action } = payload;
  if (!id || !['approve', 'reject'].includes(action)) {
    return jsonResponse(400, { error: 'id and a valid action (approve/reject) are required' });
  }

  const status = action === 'approve' ? 'approved' : 'rejected';

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('reviews').update({ status }).eq('id', id);

  if (error) {
    return jsonResponse(500, { error: 'Could not update review' });
  }

  return jsonResponse(200, { ok: true, status });
}
