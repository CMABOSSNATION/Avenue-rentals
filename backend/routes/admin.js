// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireRole } = require('../middleware/auth');
const whatsapp = require('../services/whatsapp');

// All admin routes require admin role
router.use(requireRole('admin'));

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [users, pendingListings, activeListings, openReports, deals] = await Promise.all([
      supabase.from('users').select('id, role', { count: 'exact' }),
      supabase.from('properties').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('properties').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('deals').select('id', { count: 'exact' }).eq('status', 'completed'),
    ]);

    const landlords = users.data?.filter(u => u.role === 'landlord').length || 0;
    const tenants = users.data?.filter(u => u.role === 'tenant').length || 0;

    res.json({
      total_users: users.count,
      landlords,
      tenants,
      pending_listings: pendingListings.count,
      active_listings: activeListings.count,
      open_reports: openReports.count,
      completed_deals: deals.count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pending listings queue
router.get('/properties/pending', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        property_images(url, order_index),
        users!landlord_id(id, name, phone, avatar_url, is_verified, national_id_verified)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve listing
router.put('/properties/:id/approve', async (req, res) => {
  try {
    const { data: property } = await supabase
      .from('properties')
      .select('*, users!landlord_id(name, phone)')
      .eq('id', req.params.id)
      .single();

    if (!property) return res.status(404).json({ error: 'Property not found' });

    await supabase
      .from('properties')
      .update({ status: 'active', video_verified: true })
      .eq('id', req.params.id);

    await supabase.from('admin_logs').insert({
      admin_id: req.userId,
      action: 'approve_listing',
      target_type: 'property',
      target_id: req.params.id,
    });

    const landlord = property.users;
    if (landlord?.phone) {
      await whatsapp.notifyLandlordListingApproved(landlord.phone, landlord.name, property.title);
    }

    res.json({ message: 'Listing approved and live' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject listing
router.put('/properties/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Rejection reason required' });

    const { data: property } = await supabase
      .from('properties')
      .select('*, users!landlord_id(name, phone)')
      .eq('id', req.params.id)
      .single();

    if (!property) return res.status(404).json({ error: 'Property not found' });

    await supabase
      .from('properties')
      .update({ status: 'rejected', rejection_reason: reason })
      .eq('id', req.params.id);

    await supabase.from('admin_logs').insert({
      admin_id: req.userId,
      action: 'reject_listing',
      target_type: 'property',
      target_id: req.params.id,
      details: reason,
    });

    const landlord = property.users;
    if (landlord?.phone) {
      await whatsapp.notifyLandlordListingRejected(landlord.phone, landlord.name, property.title, reason);
    }

    res.json({ message: 'Listing rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reports queue
router.get('/reports', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:users!reporter_id(name, phone),
        properties(id, title, district, landlord_id, users!landlord_id(name, phone))
      `)
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resolve report
router.put('/reports/:id', async (req, res) => {
  try {
    const { action, admin_note } = req.body;
    // action: 'dismiss' | 'warn' | 'suspend' | 'ban'
    await supabase
      .from('reports')
      .update({ status: action, admin_note, resolved_at: new Date() })
      .eq('id', req.params.id);

    res.json({ message: `Report ${action}ed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ban user
router.put('/users/:id/ban', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Ban reason required' });

    const { data: user } = await supabase
      .from('users')
      .select('phone')
      .eq('id', req.params.id)
      .single();

    if (!user) return res.status(404).json({ error: 'User not found' });

    await supabase
      .from('users')
      .update({ is_banned: true, ban_reason: reason })
      .eq('id', req.params.id);

    // Add to blacklist
    await supabase
      .from('blacklist')
      .upsert({ phone: user.phone, reason, added_by: req.userId });

    await supabase.from('admin_logs').insert({
      admin_id: req.userId,
      action: 'ban_user',
      target_type: 'user',
      target_id: req.params.id,
      details: reason,
    });

    res.json({ message: 'User banned and blacklisted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify national ID
router.put('/users/:id/verify-id', async (req, res) => {
  try {
    const { approved, reason } = req.body;
    await supabase
      .from('users')
      .update({
        national_id_verified: approved,
        is_verified: approved,
        national_id_rejected_reason: approved ? null : reason,
      })
      .eq('id', req.params.id);

    res.json({ message: approved ? 'User verified' : 'Verification rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all flagged users
router.get('/users/flagged', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, behavioral_flags(*)')
      .eq('is_flagged', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search users
router.get('/users', async (req, res) => {
  try {
    const { q } = req.query;
    let query = supabase.from('users').select('*').order('created_at', { ascending: false });

    if (q) {
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data, error } = await query.limit(50);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
