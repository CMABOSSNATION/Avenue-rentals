// middleware/deviceFingerprint.js — Cloudflare Workers compatible
import { getSupabase } from '../config/supabase.js';

export async function deviceFingerprint(c, next) {
  c.set('deviceId', c.req.header('x-device-id') || null);
  await next();
}

export async function checkDeviceFingerprint(userId, deviceId, env) {
  if (!deviceId) return;
  const supabase = getSupabase(env);

  const { data: otherAccounts } = await supabase
    .from('users')
    .select('id, phone, role')
    .eq('device_fingerprint', deviceId)
    .neq('id', userId);

  if (otherAccounts && otherAccounts.length > 0) {
    const flagReason = `Device ${deviceId} used on multiple accounts: ${otherAccounts.map(a => a.phone).join(', ')}`;

    await supabase.from('behavioral_flags').insert([
      { user_id: userId, flag_type: 'multi_account_device', details: flagReason },
      ...otherAccounts.map(acc => ({
        user_id: acc.id,
        flag_type: 'multi_account_device',
        details: flagReason,
      })),
    ]);

    const allIds = [userId, ...otherAccounts.map(a => a.id)];
    await supabase
      .from('users')
      .update({ is_flagged: true, flag_reason: 'Multi-account device detected' })
      .in('id', allIds);
  }

  await supabase
    .from('users')
    .update({ device_fingerprint: deviceId, last_active: new Date() })
    .eq('id', userId);
}

export async function checkBehavioralLimits(userId, action, env) {
  const supabase = getSupabase(env);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  if (action === 'create_listing') {
    const { count } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('landlord_id', userId)
      .gte('created_at', dayAgo.toISOString());

    if (count >= 5) {
      await flagUser(userId, 'excessive_listings', 'Created 5+ listings in 24h', env);
      return false;
    }
  }

  if (action === 'send_inquiry') {
    const { count } = await supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', userId)
      .gte('created_at', dayAgo.toISOString());

    if (count >= 15) {
      await flagUser(userId, 'excessive_inquiries', 'Sent 15+ inquiries in 24h', env);
      return false;
    }
  }

  return true;
}

export async function flagUser(userId, flagType, details, env) {
  const supabase = getSupabase(env);
  await supabase.from('behavioral_flags').insert({ user_id: userId, flag_type: flagType, details });
  await supabase.from('users').update({ is_flagged: true, flag_reason: details }).eq('id', userId);
}
