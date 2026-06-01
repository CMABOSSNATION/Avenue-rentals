// backend/routes/deals.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireRole } = require('../middleware/auth');
const whatsapp = require('../services/whatsapp');

/**
 * POST /deals — Create deal from accepted inquiry
 */
router.post('/', requireRole('landlord'), async (req, res) => {
  try {
    const { inquiry_id, agreed_price, move_in_date } = req.body;
    if (!inquiry_id || !agreed_price) {
      return res.status(400).json({ error: 'inquiry_id and agreed_price required' });
    }

    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('*, properties(title)')
      .eq('id', inquiry_id)
      .single();

    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    if (inquiry.landlord_id !== req.userId) {
      return res.status(403).json({ error: 'Not your inquiry' });
    }
    if (inquiry.status !== 'accepted') {
      return res.status(400).json({ error: 'Inquiry must be accepted first' });
    }

    // Platform fee: 10,000 UGX for listings under 500k, 20,000 UGX otherwise
    const platformFee = agreed_price < 500000 ? 10000 : 20000;

    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        property_id: inquiry.property_id,
        tenant_id: inquiry.tenant_id,
        landlord_id: req.userId,
        inquiry_id,
        agreed_price: parseInt(agreed_price),
        platform_fee: platformFee,
        move_in_date: move_in_date || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      deal,
      payment_instructions: {
        message: `Ask tenant to send ${platformFee.toLocaleString()} UGX to ${process.env.PLATFORM_MOMO_NUMBER} (${process.env.PLATFORM_MOMO_NAME}) with reference: NYUMBA-${deal.id.slice(0, 8).toUpperCase()}`,
        platform_momo: process.env.PLATFORM_MOMO_NUMBER,
        platform_name: process.env.PLATFORM_MOMO_NAME,
        reference: `NYUMBA-${deal.id.slice(0, 8).toUpperCase()}`,
        amount: platformFee,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /deals — Get my deals
 */
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('deals')
      .select(`
        *,
        properties(id, title, district, town, type, property_images(url, order_index)),
        tenant:users!tenant_id(id, name, avatar_url, phone),
        landlord:users!landlord_id(id, name, avatar_url, phone)
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
 * GET /deals/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('deals')
      .select(`
        *,
        properties(*),
        tenant:users!tenant_id(*),
        landlord:users!landlord_id(*)
      `)
      .eq('id', req.params.id)
      .single();

    if (!data) return res.status(404).json({ error: 'Deal not found' });
    if (data.tenant_id !== req.userId && data.landlord_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /deals/:id/confirm — Tenant confirms moved in
 */
router.put('/:id/confirm', requireRole('tenant'), async (req, res) => {
  try {
    const { data: deal } = await supabase
      .from('deals')
      .select('*, properties(title), landlord:users!landlord_id(name, phone)')
      .eq('id', req.params.id)
      .single();

    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    if (deal.tenant_id !== req.userId) return res.status(403).json({ error: 'Not your deal' });

    await supabase
      .from('deals')
      .update({ status: 'confirmed' })
      .eq('id', req.params.id);

    // Mark property as taken
    await supabase
      .from('properties')
      .update({ status: 'taken' })
      .eq('id', deal.property_id);

    // Notify landlord
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const landlordSocketId = connectedUsers.get(deal.landlord_id);
    if (landlordSocketId) {
      io.to(landlordSocketId).emit('deal_confirmed', { deal_id: req.params.id });
    }

    res.json({ message: 'Move-in confirmed. Enjoy your new home!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /deals/:id/dispute
 */
router.put('/:id/dispute', async (req, res) => {
  try {
    const { reason } = req.body;
    const { data: deal } = await supabase
      .from('deals')
      .select('tenant_id, landlord_id')
      .eq('id', req.params.id)
      .single();

    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    if (deal.tenant_id !== req.userId && deal.landlord_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await supabase
      .from('deals')
      .update({ status: 'disputed', dispute_reason: reason })
      .eq('id', req.params.id);

    res.json({ message: 'Dispute raised. Our team will contact you within 24 hours.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
