// services/otp.js — Cloudflare Workers compatible
import { getSupabase } from '../config/supabase.js';

function generateOTP() {
  // Workers have crypto.getRandomValues
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(100000 + (arr[0] % 900000));
}

export async function sendOTP(phone, env) {
  const supabase = getSupabase(env);

  // Clean up expired OTPs
  await supabase
    .from('otp_codes')
    .delete()
    .eq('phone', phone)
    .lt('expires_at', new Date().toISOString());

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + parseInt(env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000);

  await supabase.from('otp_codes').insert({
    phone,
    code,
    expires_at: expiresAt.toISOString(),
  });

  const message = `Your Nyumba verification code is: ${code}. Valid for ${env.OTP_EXPIRES_MINUTES || 10} minutes. Do not share this code.`;

  if (env.NODE_ENV === 'development') {
    console.log(`[OTP DEV] Code for ${phone}: ${code}`);
    return { success: true, dev: true };
  }

  // Africa's Talking SMS via HTTP (no Node SDK needed)
  try {
    const formData = new URLSearchParams({
      username: env.AFRICASTALKING_USERNAME,
      to: phone,
      message,
      from: env.AFRICASTALKING_SENDER_ID || 'NYUMBA',
    });

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'apiKey': env.AFRICASTALKING_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    if (!response.ok) throw new Error(`SMS API error: ${response.status}`);
    return { success: true };
  } catch (err) {
    console.error('[OTP] SMS send failed:', err.message);
    throw new Error('Failed to send OTP. Please try again.');
  }
}

export async function verifyOTP(phone, code, env) {
  const supabase = getSupabase(env);

  const { data: otpRecord } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('phone', phone)
    .eq('code', code)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!otpRecord) return { valid: false, reason: 'Invalid or expired code' };

  await supabase.from('otp_codes').update({ used: true }).eq('id', otpRecord.id);
  return { valid: true };
}
