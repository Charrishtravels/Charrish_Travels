import { randomUUID } from 'node:crypto';
import { getSupabaseClient, jsonResponse } from './_supabase.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_PHOTO_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

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
  const occupation = String(payload.occupation || '').trim().slice(0, 80) || null;
  const message = String(payload.message || '').trim().slice(0, 1000);
  const rating = Number(payload.rating);

  if (!name || !message) {
    return jsonResponse(400, { error: 'Name and message are required' });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return jsonResponse(400, { error: 'Rating must be an integer between 1 and 5' });
  }

  const supabase = getSupabaseClient();

  // Photo is optional. Client sends it as a base64 string plus its MIME type.
  let photoUrl = null;
  const photoBase64 = payload.photo ? String(payload.photo) : null;
  const photoType = payload.photoType ? String(payload.photoType) : null;

  if (photoBase64) {
    const extension = ALLOWED_PHOTO_TYPES[photoType];
    if (!extension) {
      return jsonResponse(400, { error: 'Photo must be a JPEG, PNG or WebP image' });
    }

    let photoBuffer;
    try {
      photoBuffer = Buffer.from(photoBase64, 'base64');
    } catch {
      return jsonResponse(400, { error: 'Invalid photo data' });
    }

    if (photoBuffer.length === 0 || photoBuffer.length > MAX_PHOTO_BYTES) {
      return jsonResponse(400, { error: 'Photo must be under 5MB' });
    }

    const path = `${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('review-photos')
      .upload(path, photoBuffer, { contentType: photoType, upsert: false });

    if (uploadError) {
      return jsonResponse(500, { error: 'Could not upload photo' });
    }

    const { data: publicUrlData } = supabase.storage.from('review-photos').getPublicUrl(path);
    photoUrl = publicUrlData?.publicUrl ?? null;
  }

  const { error } = await supabase.from('reviews').insert({
    name,
    occupation,
    message,
    rating,
    photo_url: photoUrl,
    status: 'pending',
  });

  if (error) {
    return jsonResponse(500, { error: 'Could not save review' });
  }

  return jsonResponse(201, { ok: true });
}
