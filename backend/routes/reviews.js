// backend/routes/reviews.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

router.post('/', async (req, res) => {
  try {
    const { deal_id, rating, comment } = req.body;
    if (!deal_id || !rating) return res.status(400).json({ error: 'deal_id and rating required' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

    const { data: deal } = await supabase
      .from('deals')
      .select('tenant_id, landlord_id, status')
      .eq('id', deal_id)
      .single();

    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    if (deal.tenant_id !== req.userId && deal.landlord_id !== req.userId) {
      return res.status(403).json({ error: 'Not your deal' });
    }
    if (!['confirmed', 'completed'].includes(deal.status)) {
      return res.status(400).json({ error: 'Can only review after deal is confirmed' });
    }

    const reviewee_id = deal.tenant_id === req.userId ? deal.landlord_id : deal.tenant_id;

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({ deal_id, reviewer_id: req.userId, reviewee_id, rating, comment })
      .select()
      .single();

    if (error?.code === '23505') {
      return res.status(400).json({ error: 'You have already reviewed this deal' });
    }
    if (error) throw error;

    // Update user rating average
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', reviewee_id);

    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await supabase
      .from('users')
      .update({ rating: Math.round(avg * 10) / 10, total_reviews: allReviews.length })
      .eq('id', reviewee_id);

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/user/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, reviewer:users!reviewer_id(name, avatar_url)')
      .eq('reviewee_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
