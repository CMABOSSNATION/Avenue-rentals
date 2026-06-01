// routes/properties.js — Hono
import { Hono } from 'hono';
import { getSupabase } from '../config/supabase.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { checkBehavioralLimits } from '../middleware/deviceFingerprint.js';
import { getRegion } from '../config/ugandaLocations.js';

const properties = new Hono();

// GET /properties
properties.get('/', async (c) => {
  try {
    const { district, region, town, parish, type, min_price, max_price, is_featured, search, page = 1, limit = 20 } = c.req.query();
    const supabase = getSupabase(c.env);
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('properties')
      .select('*, property_images(url, order_index), users!landlord_id(id, name, avatar_url, rating, is_verified, national_id_verified)', { count: 'exact' })
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (district) query = query.ilike('district', district);
    if (region) query = query.eq('region', region);
    if (town) query = query.ilike('town', `%${town}%`);
    if (parish) query = query.ilike('parish', `%${parish}%`);
    if (type) query = query.eq('type', type);
    if (min_price) query = query.gte('price', parseInt(min_price));
    if (max_price) query = query.lte('price', parseInt(max_price));
    if (is_featured === 'true') query = query.eq('is_featured', true);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,area.ilike.%${search}%,district.ilike.%${search}%,town.ilike.%${search}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    return c.json({ properties: data, total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /properties/my/listings
properties.get('/my/listings', verifyToken, requireRole('landlord'), async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(url, order_index), inquiries(count)')
      .eq('landlord_id', c.get('userId'))
      .order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /properties/saved/list
properties.get('/saved/list', verifyToken, async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase
      .from('saved_properties')
      .select('property_id, properties(*, property_images(url, order_index), users!landlord_id(name, rating, is_verified))')
      .eq('user_id', c.get('userId'))
      .order('created_at', { ascending: false });
    if (error) throw error;
    return c.json(data.map(s => s.properties));
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /properties/:id
properties.get('/:id', async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(url, order_index, gps_lat, gps_lng), users!landlord_id(id, name, avatar_url, rating, total_reviews, is_verified, national_id_verified, created_at, district)')
      .eq('id', c.req.param('id'))
      .single();

    if (error || !data) return c.json({ error: 'Property not found' }, 404);
    if (data.status !== 'active') {
      const authHeader = c.req.header('authorization');
      if (!authHeader) return c.json({ error: 'Property not found' }, 404);
    }
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /properties/:id/view
properties.post('/:id/view', async (c) => {
  const supabase = getSupabase(c.env);
  await supabase.rpc('increment_property_views', { property_id: c.req.param('id') });
  return c.json({ success: true });
});

// POST /properties
properties.post('/', verifyToken, requireRole('landlord'), async (c) => {
  try {
    const body = await c.req.json();
    const { title, description, type, price, price_period, district, region, town, parish, area, full_address, landmark, latitude, longitude, amenities } = body;

    if (!title || !type || !price || !district) {
      return c.json({ error: 'Title, type, price, and district are required' }, 400);
    }

    const allowed = await checkBehavioralLimits(c.get('userId'), 'create_listing', c.env);
    if (!allowed) return c.json({ error: 'You have created too many listings today. Try again tomorrow.' }, 429);

    const supabase = getSupabase(c.env);
    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        landlord_id: c.get('userId'), title: title.trim(), description, type,
        price: parseInt(price), price_period: price_period || 'month',
        district, region: region || getRegion(district),
        town, parish, area, full_address, landmark, latitude, longitude,
        amenities: amenities || [], status: 'pending',
      })
      .select().single();

    if (error) throw error;
    return c.json({ property, message: 'Listing submitted for review. You will be notified within 24 hours.' }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// PUT /properties/:id
properties.put('/:id', verifyToken, async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data: existing } = await supabase.from('properties').select('landlord_id, status').eq('id', c.req.param('id')).single();
    if (!existing) return c.json({ error: 'Property not found' }, 404);
    if (existing.landlord_id !== c.get('userId')) return c.json({ error: 'Not your property' }, 403);

    const body = await c.req.json();
    const allowed = ['title', 'description', 'price', 'price_period', 'area', 'full_address', 'landmark', 'amenities', 'latitude', 'longitude', 'town', 'parish'];
    const updates = {};
    allowed.forEach(field => { if (body[field] !== undefined) updates[field] = body[field]; });
    updates.updated_at = new Date();
    if (existing.status === 'rejected') { updates.status = 'pending'; updates.rejection_reason = null; }

    const { data, error } = await supabase.from('properties').update(updates).eq('id', c.req.param('id')).select().single();
    if (error) throw error;
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// DELETE /properties/:id
properties.delete('/:id', verifyToken, async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data: existing } = await supabase.from('properties').select('landlord_id').eq('id', c.req.param('id')).single();
    if (!existing) return c.json({ error: 'Property not found' }, 404);
    if (existing.landlord_id !== c.get('userId')) return c.json({ error: 'Not your property' }, 403);
    await supabase.from('properties').delete().eq('id', c.req.param('id'));
    return c.json({ message: 'Property deleted' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /properties/:id/images
properties.post('/:id/images', verifyToken, async (c) => {
  try {
    const { images } = await c.req.json();
    if (!images || !Array.isArray(images)) return c.json({ error: 'Images array required' }, 400);
    if (images.length > 10) return c.json({ error: 'Maximum 10 images allowed' }, 400);

    const supabase = getSupabase(c.env);
    const { data: property } = await supabase.from('properties').select('landlord_id').eq('id', c.req.param('id')).single();
    if (!property || property.landlord_id !== c.get('userId')) return c.json({ error: 'Not authorized' }, 403);

    const imageRecords = images.map((img, idx) => ({
      property_id: c.req.param('id'), url: img.url,
      order_index: img.order_index ?? idx, gps_lat: img.gps_lat || null, gps_lng: img.gps_lng || null,
    }));

    const { data, error } = await supabase.from('property_images').insert(imageRecords).select();
    if (error) throw error;
    return c.json({ images: data });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /properties/:id/video
properties.post('/:id/video', verifyToken, async (c) => {
  try {
    const { video_url } = await c.req.json();
    if (!video_url) return c.json({ error: 'video_url required' }, 400);
    const supabase = getSupabase(c.env);
    const { data: property } = await supabase.from('properties').select('landlord_id').eq('id', c.req.param('id')).single();
    if (!property || property.landlord_id !== c.get('userId')) return c.json({ error: 'Not authorized' }, 403);
    await supabase.from('properties').update({ video_url, updated_at: new Date() }).eq('id', c.req.param('id'));
    return c.json({ message: 'Video uploaded. Listing submitted for review.' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /properties/:id/report
properties.post('/:id/report', verifyToken, async (c) => {
  try {
    const { reason, details } = await c.req.json();
    const validReasons = ['Fake listing', 'Wrong location', 'Broker not landlord', 'Scam', 'Misleading photos', 'Property already taken', 'Other'];
    if (!reason || !validReasons.includes(reason)) return c.json({ error: 'Valid reason required' }, 400);

    const supabase = getSupabase(c.env);
    const { data: existing } = await supabase.from('reports').select('id').eq('reporter_id', c.get('userId')).eq('property_id', c.req.param('id')).single();
    if (existing) return c.json({ error: 'You have already reported this property' }, 400);

    await supabase.from('reports').insert({ reporter_id: c.get('userId'), property_id: c.req.param('id'), reason, details });

    const { data: property } = await supabase.from('properties').select('report_count').eq('id', c.req.param('id')).single();
    const newCount = (property?.report_count || 0) + 1;
    const updates = { report_count: newCount };
    if (newCount >= 3) updates.status = 'suspended';
    await supabase.from('properties').update(updates).eq('id', c.req.param('id'));

    return c.json({ message: 'Report submitted. Our team will review this listing.' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /properties/:id/save
properties.post('/:id/save', verifyToken, async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data: existing } = await supabase.from('saved_properties').select('id').eq('user_id', c.get('userId')).eq('property_id', c.req.param('id')).single();
    if (existing) {
      await supabase.from('saved_properties').delete().eq('id', existing.id);
      return c.json({ saved: false });
    }
    await supabase.from('saved_properties').insert({ user_id: c.get('userId'), property_id: c.req.param('id') });
    return c.json({ saved: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

export default properties;
