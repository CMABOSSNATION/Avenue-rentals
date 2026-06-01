// routes/inquiries.js — Hono
import { Hono } from 'hono';
import { getSupabase } from '../config/supabase.js';
import { requireRole } from '../middleware/auth.js';
import { checkBehavioralLimits } from '../middleware/deviceFingerprint.js';
import * as whatsapp from '../services/whatsapp.js';

const inquiries = new Hono();

// POST /inquiries
inquiries.post('/', requireRole('tenant'), async (c) => {
  try {
    const { property_id, message } = await c.req.json();
    if (!property_id) return c.json({ error: 'property_id required' }, 400);

    const allowed = await checkBehavioralLimits(c.get('userId'), 'send_inquiry', c.env);
    if (!allowed) return c.json({ error: 'You have sent too many inquiries today. Try again tomorrow.' }, 429);

    const supabase = getSupabase(c.env);
    const { data: property } = await supabase
      .from('properties').select('id, title, landlord_id, status, users!landlord_id(name, phone)').eq('id', property_id).single();

    if (!property) return c.json({ error: 'Property not found' }, 404);
    if (property.status !== 'active') return c.json({ error: 'This property is not available' }, 400);
    if (property.landlord_id === c.get('userId')) return c.json({ error: 'You cannot inquire about your own property' }, 400);

    const { data: existing } = await supabase
      .from('inquiries').select('id, status').eq('property_id', property_id).eq('tenant_id', c.get('userId')).neq('status', 'closed').single();
    if (existing) return c.json({ error: 'You already have an open inquiry for this property', inquiry_id: existing.id }, 400);

    const { data: tenant } = await supabase.from('users').select('name, phone').eq('id', c.get('userId')).single();

    const { data: inquiry, error } = await supabase
      .from('inquiries')
      .insert({ property_id, tenant_id: c.get('userId'), landlord_id: property.landlord_id, message: message || 'Hello, I am interested in your property.' })
      .select().single();
    if (error) throw error;

    await supabase.rpc('increment', { table_name: 'properties', column_name: 'inquiries_count', row_id: property_id });

    const landlord = property.users;
    if (landlord?.phone) {
      await whatsapp.notifyLandlordNewInquiry(landlord.phone, landlord.name, tenant.name, property.title, c.env);
    }

    return c.json({ inquiry }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /inquiries
inquiries.get('/', async (c) => {
  try {
    const supabase = getSupabase(c.env);
    let query = supabase
      .from('inquiries')
      .select('*, properties(id, title, district, town, type, price, property_images(url, order_index)), tenant:users!tenant_id(id, name, avatar_url, rating), landlord:users!landlord_id(id, name, avatar_url, rating, is_verified)')
      .order('created_at', { ascending: false });

    if (c.get('userRole') === 'tenant') {
      query = query.eq('tenant_id', c.get('userId'));
    } else {
      query = query.eq('landlord_id', c.get('userId'));
    }

    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// PUT /inquiries/:id/accept
inquiries.put('/:id/accept', requireRole('landlord'), async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data: inquiry } = await supabase
      .from('inquiries').select('*, properties(title), tenant:users!tenant_id(name, phone)').eq('id', c.req.param('id')).single();

    if (!inquiry) return c.json({ error: 'Inquiry not found' }, 404);
    if (inquiry.landlord_id !== c.get('userId')) return c.json({ error: 'Not your inquiry' }, 403);

    await supabase.from('inquiries').update({ status: 'accepted' }).eq('id', c.req.param('id'));

    const { data: landlord } = await supabase.from('users').select('name').eq('id', c.get('userId')).single();

    if (inquiry.tenant?.phone) {
      await whatsapp.notifyTenantInquiryAccepted(inquiry.tenant.phone, inquiry.tenant.name, landlord.name, inquiry.properties.title, c.env);
    }

    return c.json({ message: 'Inquiry accepted' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// PUT /inquiries/:id/reject
inquiries.put('/:id/reject', requireRole('landlord'), async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data: inquiry } = await supabase
      .from('inquiries').select('*, properties(title), tenant:users!tenant_id(name, phone)').eq('id', c.req.param('id')).single();

    if (!inquiry) return c.json({ error: 'Inquiry not found' }, 404);
    if (inquiry.landlord_id !== c.get('userId')) return c.json({ error: 'Not your inquiry' }, 403);

    await supabase.from('inquiries').update({ status: 'rejected' }).eq('id', c.req.param('id'));

    const { data: landlord } = await supabase.from('users').select('name').eq('id', c.get('userId')).single();
    if (inquiry.tenant?.phone) {
      await whatsapp.notifyTenantInquiryRejected(inquiry.tenant.phone, inquiry.tenant.name, landlord.name, inquiry.properties.title, c.env);
    }

    return c.json({ message: 'Inquiry rejected' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

export default inquiries;
