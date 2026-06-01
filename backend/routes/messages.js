// routes/messages.js — Hono
// NOTE: Socket.io replaced with Supabase Realtime.
// Mobile app should subscribe to Supabase channel:
//   supabase.channel('inquiry:ID').on('postgres_changes', ...) 
// This endpoint handles REST API for message history + sending.

import { Hono } from 'hono';
import { getSupabase } from '../config/supabase.js';

const messages = new Hono();

// GET /inquiries/:id/messages
messages.get('/:id/messages', async (c) => {
  try {
    const userId = c.get('userId');
    const supabase = getSupabase(c.env);

    const { data: inquiry } = await supabase
      .from('inquiries').select('tenant_id, landlord_id').eq('id', c.req.param('id')).single();
    if (!inquiry) return c.json({ error: 'Inquiry not found' }, 404);
    if (inquiry.tenant_id !== userId && inquiry.landlord_id !== userId) {
      return c.json({ error: 'Not authorized' }, 403);
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:users!sender_id(id, name, avatar_url)')
      .eq('inquiry_id', c.req.param('id'))
      .order('created_at', { ascending: true });
    if (error) throw error;

    // Mark messages as read
    await supabase.from('messages').update({ is_read: true })
      .eq('inquiry_id', c.req.param('id')).neq('sender_id', userId);

    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /inquiries/:id/messages
messages.post('/:id/messages', async (c) => {
  try {
    const userId = c.get('userId');
    const { content, message_type, image_url } = await c.req.json();
    if (!content && !image_url) return c.json({ error: 'Content or image required' }, 400);

    const supabase = getSupabase(c.env);
    const { data: inquiry } = await supabase
      .from('inquiries').select('tenant_id, landlord_id, status').eq('id', c.req.param('id')).single();
    if (!inquiry) return c.json({ error: 'Inquiry not found' }, 404);
    if (inquiry.tenant_id !== userId && inquiry.landlord_id !== userId) {
      return c.json({ error: 'Not authorized' }, 403);
    }
    if (inquiry.status === 'rejected' || inquiry.status === 'closed') {
      return c.json({ error: 'This conversation is closed' }, 400);
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        inquiry_id: c.req.param('id'),
        sender_id: userId,
        content: content || '',
        message_type: message_type || 'text',
        image_url: image_url || null,
      })
      .select('*, sender:users!sender_id(id, name, avatar_url)')
      .single();
    if (error) throw error;

    // Supabase Realtime handles push to subscribers automatically
    // via postgres_changes on the messages table.
    // No Socket.io needed.

    return c.json(message, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

export default messages;
