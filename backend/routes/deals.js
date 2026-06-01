// routes/deals.js — Hono
import { Hono } from 'hono';
import { getSupabase } from '../config/supabase.js';
import { requireRole } from '../middleware/auth.js';
import * as whatsapp from '../services/whatsapp.js';

const deals = new Hono();

deals.post('/', requireRole('landlord'), async (c) => {
  try {
    const { inquiry_id, agreed_price, move_in_date } = await c.req.json();
    if (!inquiry_id || !agreed_price) return c.json({ error: 'inquiry_id and agreed_price required' }, 400);

    const supabase = getSupabase(c.env);
    const { data: inquiry } = await supabase.from('inquiries').select('*, properties(title)').eq('id', inquiry_id).single();
    if (!inquiry) return c.json({ error: 'Inquiry not found' }, 404);
    if (inquiry.landlord_id !== c.get('userId')) return c.json({ error: 'Not your inquiry' }, 403);
    if (inquiry.status !== 'accepted') return c.json({ error: 'Inquiry must be accepted first' }, 400);

    const platformFee = agreed_price < 500000 ? 10000 : 20000;
    const { data: deal, error } = await supabase
      .from('deals')
      .insert({ property_id: inquiry.property_id, tenant_id: inquiry.tenant_id, landlord_id: c.get('userId'), inquiry_id, agreed_price: parseInt(agreed_price), platform_fee: platformFee, move_in_date: move_in_date || null, status: 'pending' })
      .select().single();
    if (error) throw error;

    return c.json({
      deal,
      payment_instructions: {
        message: `Ask tenant to send ${platformFee.toLocaleString()} UGX to ${c.env.PLATFORM_MOMO_NUMBER} (${c.env.PLATFORM_MOMO_NAME}) with reference: NYUMBA-${deal.id.slice(0, 8).toUpperCase()}`,
        platform_momo: c.env.PLATFORM_MOMO_NUMBER, platform_name: c.env.PLATFORM_MOMO_NAME,
        reference: `NYUMBA-${deal.id.slice(0, 8).toUpperCase()}`, amount: platformFee,
      },
    }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

deals.get('/', async (c) => {
  try {
    const supabase = getSupabase(c.env);
    let query = supabase
      .from('deals')
      .select('*, properties(id, title, district, town, type, property_images(url, order_index)), tenant:users!tenant_id(id, name, avatar_url, phone), landlord:users!landlord_id(id, name, avatar_url, phone)')
      .order('created_at', { ascending: false });
    if (c.get('userRole') === 'tenant') query = query.eq('tenant_id', c.get('userId'));
    else query = query.eq('landlord_id', c.get('userId'));
    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

deals.get('/:id', async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase.from('deals').select('*, properties(*), tenant:users!tenant_id(*), landlord:users!landlord_id(*)').eq('id', c.req.param('id')).single();
    if (!data) return c.json({ error: 'Deal not found' }, 404);
    if (data.tenant_id !== c.get('userId') && data.landlord_id !== c.get('userId')) return c.json({ error: 'Not authorized' }, 403);
    if (error) throw error;
    return c.json(data);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

deals.put('/:id/confirm', requireRole('tenant'), async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data: deal } = await supabase.from('deals').select('*, properties(title), landlord:users!landlord_id(name, phone)').eq('id', c.req.param('id')).single();
    if (!deal) return c.json({ error: 'Deal not found' }, 404);
    if (deal.tenant_id !== c.get('userId')) return c.json({ error: 'Not your deal' }, 403);
    await supabase.from('deals').update({ status: 'confirmed' }).eq('id', c.req.param('id'));
    await supabase.from('properties').update({ status: 'taken' }).eq('id', deal.property_id);
    return c.json({ message: 'Move-in confirmed. Enjoy your new home!' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

deals.put('/:id/dispute', async (c) => {
  try {
    const { reason } = await c.req.json();
    const supabase = getSupabase(c.env);
    const { data: deal } = await supabase.from('deals').select('tenant_id, landlord_id').eq('id', c.req.param('id')).single();
    if (!deal) return c.json({ error: 'Deal not found' }, 404);
    if (deal.tenant_id !== c.get('userId') && deal.landlord_id !== c.get('userId')) return c.json({ error: 'Not authorized' }, 403);
    await supabase.from('deals').update({ status: 'disputed', dispute_reason: reason }).eq('id', c.req.param('id'));
    return c.json({ message: 'Dispute raised. Our team will contact you within 24 hours.' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

export default deals;
