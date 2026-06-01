// routes/reviews.js — Hono
import { Hono } from 'hono';
import { getSupabase } from '../config/supabase.js';

const reviews = new Hono();

reviews.post('/', async (c) => {
  try {
    const { deal_id, rating, comment } = await c.req.json();
    if (!deal_id || !rating) return c.json({ error: 'deal_id and rating required' }, 400);
    if (rating < 1 || rating > 5) return c.json({ error: 'Rating must be 1-5' }, 400);

    const supabase = getSupabase(c.env);
    const { data: deal } = await supabase.from('deals').select('tenant_id, landlord_id, status').eq('id', deal_id).single();
    if (!deal) return c.json({ error: 'Deal not found' }, 404);
    if (deal.tenant_id !== c.get('userId') && deal.landlord_id !== c.get('userId')) return c.json({ error: 'Not your deal' }, 403);
    if (!['confirmed', 'completed'].includes(deal.status)) return c.json({ error: 'Can only review after deal is confirmed' }, 400);

    const reviewee_id = deal.tenant_id === c.get('userId') ? deal.landlord_id : deal.tenant_id;
    const { data: review, error } = await supabase
      .from('reviews').insert({ deal_id, reviewer_id: c.get('userId'), reviewee_id, rating, comment }).select().single();

    if (error?.code === '23505') return c.json({ error: 'You have already reviewed this deal' }, 400);
    if (error) throw error;

    const { data: allReviews } = await supabase.from('reviews').select('rating').eq('reviewee_id', reviewee_id);
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await supabase.from('users').update({ rating: Math.round(avg * 10) / 10, total_reviews: allReviews.length }).eq('id', reviewee_id);

    return c.json(review, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

reviews.get('/user/:id', async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase
      .from('reviews').select('*, reviewer:users!reviewer_id(name, avatar_url)').eq('reviewee_id', c.req.param('id')).order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

export default reviews;
