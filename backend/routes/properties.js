// backend/routes/properties.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { checkBehavioralLimits } = require('../middleware/deviceFingerprint');
const whatsapp = require('../services/whatsapp');

/**
 * GET /properties
 * Filters: district, region, town, parish, type, min_price, max_price,
 *          is_featured, page, limit
 * Uganda-wide search
 */
router.get('/', async (req, res) => {
  try {
    const {
      district,
      region,
      town,
      parish,
      type,
      min_price,
      max_price,
      is_featured,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('properties')
      .select(`
        *,
        property_images(url, order_index),
        users!landlord_id(id, name, avatar_url, rating, is_verified, national_id_verified)
      `, { count: 'exact' })
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Filters
    if (district) query = query.ilike('district', district);
    if (region) query = query.eq('region', region);
    if (town) query = query.ilike('town', `%${town}%`);
    if (parish) query = query.ilike('parish', `%${parish}%`);
    if (type) query = query.eq('type', type);
    if (min_price) query = query.gte('price', parseInt(min_price));
    if (max_price) query = query.lte('price', parseInt(max_price));
    if (is_featured === 'true') query = query.eq('is_featured', true);
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,area.ilike.%${search}%,district.ilike.%${search}%,town.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      properties: data,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /properties/:id
 * Single property with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        property_images(url, order_index, gps_lat, gps_lng),
        users!landlord_id(
          id, name, avatar_url, rating, total_reviews,
          is_verified, national_id_verified, created_at, district
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Property not found' });

    // Only show active listings publicly (pending/rejected still shown to owner)
    if (data.status !== 'active') {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(404).json({ error: 'Property not found' });
      // Will be validated by auth middleware on private routes
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /properties/:id/view
 * Increment view count
 */
router.post('/:id/view', async (req, res) => {
  await supabase.rpc('increment_property_views', { property_id: req.params.id });
  res.json({ success: true });
});

/**
 * POST /properties — Create listing (landlord only)
 */
router.post('/', verifyToken, requireRole('landlord'), async (req, res) => {
  try {
    const {
      title, description, type, price, price_period,
      district, region, town, parish, area, full_address, landmark,
      latitude, longitude, amenities,
    } = req.body;

    // Required fields
    if (!title || !type || !price || !district) {
      return res.status(400).json({ error: 'Title, type, price, and district are required' });
    }

    // Behavioral limit check
    const allowed = await checkBehavioralLimits(req.userId, 'create_listing');
    if (!allowed) {
      return res.status(429).json({
        error: 'You have created too many listings today. Try again tomorrow.',
      });
    }

    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        landlord_id: req.userId,
        title: title.trim(),
        description,
        type,
        price: parseInt(price),
        price_period: price_period || 'month',
        district,
        region: region || require('../config/ugandaLocations').getRegion(district),
        town,
        parish,
        area,
        full_address,
        landmark,
        latitude,
        longitude,
        amenities: amenities || [],
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      property,
      message: 'Listing submitted for review. You will be notified within 24 hours.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /properties/:id — Update listing (owner only)
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    // Verify ownership
    const { data: existing } = await supabase
      .from('properties')
      .select('landlord_id, status')
      .eq('id', req.params.id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Property not found' });
    if (existing.landlord_id !== req.userId) {
      return res.status(403).json({ error: 'Not your property' });
    }

    const allowed = ['title', 'description', 'price', 'price_period',
                     'area', 'full_address', 'landmark', 'amenities',
                     'latitude', 'longitude', 'town', 'parish'];

    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    updates.updated_at = new Date();

    // If editing a rejected listing, reset to pending for re-review
    if (existing.status === 'rejected') {
      updates.status = 'pending';
      updates.rejection_reason = null;
    }

    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /properties/:id — Delete listing (owner only)
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('properties')
      .select('landlord_id')
      .eq('id', req.params.id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Property not found' });
    if (existing.landlord_id !== req.userId) {
      return res.status(403).json({ error: 'Not your property' });
    }

    await supabase.from('properties').delete().eq('id', req.params.id);
    res.json({ message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /properties/:id/images — Upload images
 */
router.post('/:id/images', verifyToken, async (req, res) => {
  try {
    const { images } = req.body; // Array of { url, order_index, gps_lat, gps_lng }

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: 'Images array required' });
    }
    if (images.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 images allowed' });
    }

    // Verify ownership
    const { data: property } = await supabase
      .from('properties')
      .select('landlord_id')
      .eq('id', req.params.id)
      .single();

    if (!property || property.landlord_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const imageRecords = images.map((img, idx) => ({
      property_id: req.params.id,
      url: img.url,
      order_index: img.order_index ?? idx,
      gps_lat: img.gps_lat || null,
      gps_lng: img.gps_lng || null,
    }));

    const { data, error } = await supabase
      .from('property_images')
      .insert(imageRecords)
      .select();

    if (error) throw error;
    res.json({ images: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /properties/:id/video — Upload verification video URL
 */
router.post('/:id/video', verifyToken, async (req, res) => {
  try {
    const { video_url } = req.body;
    if (!video_url) return res.status(400).json({ error: 'video_url required' });

    const { data: property } = await supabase
      .from('properties')
      .select('landlord_id')
      .eq('id', req.params.id)
      .single();

    if (!property || property.landlord_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await supabase
      .from('properties')
      .update({ video_url, updated_at: new Date() })
      .eq('id', req.params.id);

    res.json({ message: 'Video uploaded. Listing submitted for review.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /properties/:id/report
 */
router.post('/:id/report', verifyToken, async (req, res) => {
  try {
    const { reason, details } = req.body;
    const validReasons = [
      'Fake listing', 'Wrong location', 'Broker not landlord',
      'Scam', 'Misleading photos', 'Property already taken', 'Other',
    ];

    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Valid reason required' });
    }

    // Check if user already reported this property
    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', req.userId)
      .eq('property_id', req.params.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'You have already reported this property' });
    }

    await supabase.from('reports').insert({
      reporter_id: req.userId,
      property_id: req.params.id,
      reason,
      details,
    });

    // Increment report count
    const { data: property } = await supabase
      .from('properties')
      .select('report_count, landlord_id')
      .eq('id', req.params.id)
      .single();

    const newCount = (property?.report_count || 0) + 1;
    const updates = { report_count: newCount };

    // Auto-suspend at 3 reports from different accounts
    if (newCount >= 3) {
      updates.status = 'suspended';
    }

    await supabase.from('properties').update(updates).eq('id', req.params.id);

    res.json({ message: 'Report submitted. Our team will review this listing.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /properties/my/listings — Landlord's own listings
 */
router.get('/my/listings', verifyToken, requireRole('landlord'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        property_images(url, order_index),
        inquiries(count)
      `)
      .eq('landlord_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /properties/:id/save — Save/unsave a property
 */
router.post('/:id/save', verifyToken, async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('saved_properties')
      .select('id')
      .eq('user_id', req.userId)
      .eq('property_id', req.params.id)
      .single();

    if (existing) {
      await supabase.from('saved_properties').delete().eq('id', existing.id);
      return res.json({ saved: false });
    }

    await supabase.from('saved_properties').insert({
      user_id: req.userId,
      property_id: req.params.id,
    });

    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /properties/saved/list — Get saved properties
 */
router.get('/saved/list', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_properties')
      .select(`
        property_id,
        properties(
          *,
          property_images(url, order_index),
          users!landlord_id(name, rating, is_verified)
        )
      `)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data.map(s => s.properties));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
