// backend/routes/users.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

router.get('/me', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/me', async (req, res) => {
  try {
    const allowed = ['name', 'avatar_url', 'district', 'whatsapp_optin', 'push_token'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.userId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/me/national-id', async (req, res) => {
  try {
    const { national_id_url, national_id_selfie_url } = req.body;
    if (!national_id_url || !national_id_selfie_url) {
      return res.status(400).json({ error: 'Both ID photo and selfie required' });
    }
    await supabase
      .from('users')
      .update({ national_id_url, national_id_selfie_url, national_id_verified: false })
      .eq('id', req.userId);
    res.json({ message: 'Documents submitted for review within 24 hours' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/me/momo', async (req, res) => {
  try {
    const { momo_number, momo_name, momo_network } = req.body;
    if (!momo_number || !momo_name || !momo_network) {
      return res.status(400).json({ error: 'momo_number, momo_name, and momo_network required' });
    }
    await supabase
      .from('users')
      .update({ momo_number, momo_name, momo_network })
      .eq('id', req.userId);
    res.json({ message: 'MoMo details saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, avatar_url, rating, total_reviews, is_verified, national_id_verified, created_at, district, role')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
