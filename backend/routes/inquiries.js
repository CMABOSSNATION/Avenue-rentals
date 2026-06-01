// backend/routes/inquiries.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireRole } = require('../middleware/auth');
const { checkBehavioralLimits } = require('../middleware/deviceFingerprint');
const whatsapp = require('../services/whatsapp');

/**
 * POST /inquiries — Tenant sends inquiry
 */
router.post('/', requireRole('tenant'), async (req, res) => {
  try {
    const { property_id, message } = req.body;
    if (!property_id) return res.status(400).json({ error: 'property_id required' });

    // Behavioral limit
    const allowed = await checkBehavioralLimits(req.userId, 'send_inquiry');
    if (!allowed) {
      return res.status(429).json({
        error: 'You have sent too many inquiries today. Try again tomorrow.',
      });
    }

    // Get property + landlord info
    const { data: property } = await supabase
      .from('properties')
      .select('id, title, landlord_id, status, users!landlord_id(name, phone)')
      .eq('id', property_id)
      .single();

    if (!property) return res.status(404).json({ error: 'Property not found' });
    if (property.status !== 'active') {
      return res.status(400).json({ error: 'This property is not available' });
    }
    if (property.landlord_id === req.userId) {
      return res.status(400).json({ error: 'You cannot inquire about your own property' });
    }

    // Check for existing inquiry from this tenant
    const { data: existing } = await supabase
      .from('inquiries')
      .select('id, status')
      .eq('property_id', property_id)
      .eq('tenant_id', req.userId)
      .neq('status', 'closed')
      .single();

    if (existing) {
      return res.status(400).json({
        error: 'You already have an open inquiry for this property',
        inquiry_id: existing.id,
      });
    }

    const { data: tenant } = await supabase
      .from('users')
      .select('name, phone')
      .eq('id', req.userId)
      .single();

    // Create inquiry
    const { data: inquiry, error } = await supabase
      .from('inquiries')
      .insert({
        property_id,
        tenant_id: req.userId,
        landlord_id: property.landlord_id,
        message: message || 'Hello, I am interested in your property.',
      })
      .select()
      .single();

    if (error) throw error;

    // Update property inquiry count
    await supabase.rpc('increment', {
      table_name: 'properties',
      column_name: 'inquiries_count',
      row_id: property_id,
    });

    // WhatsApp notification to landlord
    const landlord = property.users;
    if (landlord?.phone) {
      await whatsapp.notifyLandlordNewInquiry(
        landlord.phone, landlord.name, tenant.name, property.title
      );
    }

    // Socket.io: notify landlord if online
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const landlordSocketId = connectedUsers.get(property.landlord_id);
    if (landlordSocketId) {
      io.to(landlordSocketId).emit('new_inquiry', {
        inquiry,
        tenant: { name: tenant.name },
        property: { title: property.title },
      });
    }

    res.status(201).json({ inquiry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /inquiries — Get my inquiries
 */
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('inquiries')
      .select(`
        *,
        properties(id, title, district, town, type, price, property_images(url, order_index)),
        tenant:users!tenant_id(id, name, avatar_url, rating),
        landlord:users!landlord_id(id, name, avatar_url, rating, is_verified)
      `)
      .order('created_at', { ascending: false });

    if (req.userRole === 'tenant') {
      query = query.eq('tenant_id', req.userId);
    } else {
      query = query.eq('landlord_id', req.userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /inquiries/:id/accept — Landlord accepts inquiry
 */
router.put('/:id/accept', requireRole('landlord'), async (req, res) => {
  try {
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('*, properties(title), tenant:users!tenant_id(name, phone)')
      .eq('id', req.params.id)
      .single();

    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    if (inquiry.landlord_id !== req.userId) {
      return res.status(403).json({ error: 'Not your inquiry' });
    }

    await supabase
      .from('inquiries')
      .update({ status: 'accepted' })
      .eq('id', req.params.id);

    const { data: landlord } = await supabase
      .from('users')
      .select('name')
      .eq('id', req.userId)
      .single();

    // Notify tenant via WhatsApp
    if (inquiry.tenant?.phone) {
      await whatsapp.notifyTenantInquiryAccepted(
        inquiry.tenant.phone, inquiry.tenant.name,
        landlord.name, inquiry.properties.title
      );
    }

    // Socket notification
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const tenantSocketId = connectedUsers.get(inquiry.tenant_id);
    if (tenantSocketId) {
      io.to(tenantSocketId).emit('inquiry_accepted', { inquiry_id: req.params.id });
    }

    res.json({ message: 'Inquiry accepted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /inquiries/:id/reject — Landlord rejects inquiry
 */
router.put('/:id/reject', requireRole('landlord'), async (req, res) => {
  try {
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('*, properties(title), tenant:users!tenant_id(name, phone)')
      .eq('id', req.params.id)
      .single();

    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    if (inquiry.landlord_id !== req.userId) {
      return res.status(403).json({ error: 'Not your inquiry' });
    }

    await supabase
      .from('inquiries')
      .update({ status: 'rejected' })
      .eq('id', req.params.id);

    const { data: landlord } = await supabase
      .from('users')
      .select('name').eq('id', req.userId).single();

    if (inquiry.tenant?.phone) {
      await whatsapp.notifyTenantInquiryRejected(
        inquiry.tenant.phone, inquiry.tenant.name,
        landlord.name, inquiry.properties.title
      );
    }

    res.json({ message: 'Inquiry rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
