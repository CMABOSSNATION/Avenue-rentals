// routes/users.js — Hono
import { Hono } from 'hono';
import { getSupabase } from '../config/supabase.js';
import { verifyToken } from '../middleware/auth.js';

const users = new Hono();
users.use('*', verifyToken);

users.get('/me', async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase.from('users').select('*').eq('id', c.get('userId')).single();
    if (error) throw error;
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

users.put('/me', async (c) => {
  try {
    const body = await c.req.json();
    const allowed = ['name', 'avatar_url', 'district', 'whatsapp_optin', 'push_token'];
    const updates = {};
    allowed.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase.from('users').update(updates).eq('id', c.get('userId')).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

users.post('/me/national-id', async (c) => {
  try {
    const { national_id_url, national_id_selfie_url } = await c.req.json();
    if (!national_id_url || !national_id_selfie_url) return c.json({ error: 'Both ID photo and selfie required' }, 400);
    const supabase = getSupabase(c.env);
    await supabase.from('users').update({ national_id_url, national_id_selfie_url, national_id_verified: false }).eq('id', c.get('userId'));
    return c.json({ message: 'Documents submitted for review within 24 hours' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

users.post('/me/momo', async (c) => {
  try {
    const { momo_number, momo_name, momo_network } = await c.req.json();
    if (!momo_number || !momo_name || !momo_network) return c.json({ error: 'momo_number, momo_name, and momo_network required' }, 400);
    const supabase = getSupabase(c.env);
    await supabase.from('users').update({ momo_number, momo_name, momo_network }).eq('id', c.get('userId'));
    return c.json({ message: 'MoMo details saved' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

users.get('/:id', async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase
      .from('users').select('id, name, avatar_url, rating, total_reviews, is_verified, national_id_verified, created_at, district, role').eq('id', c.req.param('id')).single();
    if (error || !data) return c.json({ error: 'User not found' }, 404);
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

export default users;
