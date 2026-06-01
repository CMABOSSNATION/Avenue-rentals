// routes/admin.js — Hono
import { Hono } from 'hono';
import { getSupabase } from '../config/supabase.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import * as whatsapp from '../services/whatsapp.js';

const admin = new Hono();
admin.use('*', verifyToken, requireRole('admin'));

admin.get('/stats', async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const [users, pendingListings, activeListings, openReports, deals] = await Promise.all([
      supabase.from('users').select('id, role', { count: 'exact' }),
      supabase.from('properties').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('properties').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('deals').select('id', { count: 'exact' }).eq('status', 'completed'),
    ]);
    const landlords = users.data?.filter(u => u.role === 'landlord').length || 0;
    const tenants = users.data?.filter(u => u.role === 'tenant').length || 0;
    return c.json({ total_users: users.count, landlords, tenants, pending_listings: pendingListings.count, active_listings: activeListings.count, open_reports: openReports.count, completed_deals: deals.count });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

admin.get('/properties/pending', async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase
      .from('properties').select('*, property_images(url, order_index), users!landlord_id(id, name, phone, avatar_url, is_verified, national_id_verified)').eq('status', 'pending').order('created_at', { ascending: true });
    if (error) throw error;
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

admin.put('/properties/:id/approve', async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data: property } = await supabase.from('properties').select('*, users!landlord_id(name, phone)').eq('id', c.req.param('id')).single();
    if (!property) return c.json({ error: 'Property not found' }, 404);
    await supabase.from('properties').update({ status: 'active', video_verified: true }).eq('id', c.req.param('id'));
    await supabase.from('admin_logs').insert({ admin_id: c.get('userId'), action: 'approve_listing', target_type: 'property', target_id: c.req.param('id') });
    if (property.users?.phone) {
      await whatsapp.notifyLandlordListingApproved(property.users.phone, property.users.name, property.title, c.env);
    }
    return c.json({ message: 'Listing approved and live' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

admin.put('/properties/:id/reject', async (c) => {
  try {
    const { reason } = await c.req.json();
    if (!reason) return c.json({ error: 'Rejection reason required' }, 400);
    const supabase = getSupabase(c.env);
    const { data: property } = await supabase.from('properties').select('*, users!landlord_id(name, phone)').eq('id', c.req.param('id')).single();
    if (!property) return c.json({ error: 'Property not found' }, 404);
    await supabase.from('properties').update({ status: 'rejected', rejection_reason: reason }).eq('id', c.req.param('id'));
    await supabase.from('admin_logs').insert({ admin_id: c.get('userId'), action: 'reject_listing', target_type: 'property', target_id: c.req.param('id'), details: reason });
    if (property.users?.phone) {
      await whatsapp.notifyLandlordListingRejected(property.users.phone, property.users.name, property.title, reason, c.env);
    }
    return c.json({ message: 'Listing rejected' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

admin.get('/reports', async (c) => {
  try {
    const { status = 'pending' } = c.req.query();
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase
      .from('reports').select('*, reporter:users!reporter_id(name, phone), properties(id, title, district, landlord_id, users!landlord_id(name, phone))').eq('status', status).order('created_at', { ascending: true });
    if (error) throw error;
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

admin.put('/reports/:id', async (c) => {
  try {
    const { action, admin_note } = await c.req.json();
    const supabase = getSupabase(c.env);
    await supabase.from('reports').update({ status: action, admin_note, resolved_at: new Date() }).eq('id', c.req.param('id'));
    return c.json({ message: `Report ${action}ed` });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

admin.put('/users/:id/ban', async (c) => {
  try {
    const { reason } = await c.req.json();
    if (!reason) return c.json({ error: 'Ban reason required' }, 400);
    const supabase = getSupabase(c.env);
    const { data: user } = await supabase.from('users').select('phone').eq('id', c.req.param('id')).single();
    if (!user) return c.json({ error: 'User not found' }, 404);
    await supabase.from('users').update({ is_banned: true, ban_reason: reason }).eq('id', c.req.param('id'));
    await supabase.from('blacklist').upsert({ phone: user.phone, reason, added_by: c.get('userId') });
    await supabase.from('admin_logs').insert({ admin_id: c.get('userId'), action: 'ban_user', target_type: 'user', target_id: c.req.param('id'), details: reason });
    return c.json({ message: 'User banned and blacklisted' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

admin.put('/users/:id/verify-id', async (c) => {
  try {
    const { approved, reason } = await c.req.json();
    const supabase = getSupabase(c.env);
    await supabase.from('users').update({ national_id_verified: approved, is_verified: approved, national_id_rejected_reason: approved ? null : reason }).eq('id', c.req.param('id'));
    return c.json({ message: approved ? 'User verified' : 'Verification rejected' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

admin.get('/users/flagged', async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase.from('users').select('*, behavioral_flags(*)').eq('is_flagged', true).order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

admin.get('/users', async (c) => {
  try {
    const { q } = c.req.query();
    const supabase = getSupabase(c.env);
    let query = supabase.from('users').select('*').order('created_at', { ascending: false });
    if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    const { data, error } = await query.limit(50);
    if (error) throw error;
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

export default admin;
