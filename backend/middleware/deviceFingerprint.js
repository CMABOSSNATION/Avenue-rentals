// backend/middleware/deviceFingerprint.js
const supabase = require('../config/supabase');

function deviceFingerprint(req, res, next) {
  req.deviceId = req.headers['x-device-id'] || null;
  next();
}

/**
 * Check device fingerprint against existing accounts
 * Call after user is authenticated to detect multi-account fraud
 */
async function checkDeviceFingerprint(userId, deviceId) {
  if (!deviceId) return;

  // Find other accounts with same device ID
  const { data: otherAccounts } = await supabase
    .from('users')
    .select('id, phone, role')
    .eq('device_fingerprint', deviceId)
    .neq('id', userId);

  if (otherAccounts && otherAccounts.length > 0) {
    // Flag all associated accounts
    const flagReason = `Device ${deviceId} used on multiple accounts: ${otherAccounts.map(a => a.phone).join(', ')}`;

    await supabase
      .from('behavioral_flags')
      .insert([
        {
          user_id: userId,
          flag_type: 'multi_account_device',
          details: flagReason,
        },
        ...otherAccounts.map(acc => ({
          user_id: acc.id,
          flag_type: 'multi_account_device',
          details: flagReason,
        })),
      ]);

    // Update users as flagged
    const allIds = [userId, ...otherAccounts.map(a => a.id)];
    await supabase
      .from('users')
      .update({ is_flagged: true, flag_reason: 'Multi-account device detected' })
      .in('id', allIds);
  }

  // Update device fingerprint on user
  await supabase
    .from('users')
    .update({ device_fingerprint: deviceId, last_active: new Date() })
    .eq('id', userId);
}

/**
 * Check behavioral rate limits for fraud detection
 */
async function checkBehavioralLimits(userId, action) {
  const now = new Date();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

  if (action === 'create_listing') {
    const { count } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('landlord_id', userId)
      .gte('created_at', dayAgo.toISOString());

    if (count >= 5) {
      await flagUser(userId, 'excessive_listings', 'Created 5+ listings in 24h');
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
      await flagUser(userId, 'excessive_inquiries', 'Sent 15+ inquiries in 24h');
      return false;
    }
  }

  return true;
}

async function flagUser(userId, flagType, details) {
  await supabase.from('behavioral_flags').insert({
    user_id: userId,
    flag_type: flagType,
    details,
  });
  await supabase
    .from('users')
    .update({ is_flagged: true, flag_reason: details })
    .eq('id', userId);
}

module.exports = {
  deviceFingerprint,
  checkDeviceFingerprint,
  checkBehavioralLimits,
  flagUser,
};
