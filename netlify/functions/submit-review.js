import { getSupabaseClient, jsonResponse } from './_supabase.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const name = String(payload.name || '').trim().slice(0, 80);
  const message = String(payload.message || '').trim().slice(0, 1000);
  const rating = Number(payload.rating);

  if (!name || !message) {
    return jsonResponse(400, { error: 'Name and message are required' });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return jsonResponse(400, { error: 'Rating must be an integer between 1 and 5' });
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('reviews').insert({
    name,
    message,
    rating,
    status: 'pending',
  });

  if (error) {
    return jsonResponse(500, { error: 'Could not save review' });
  }

  return jsonResponse(201, { ok: true });
}
