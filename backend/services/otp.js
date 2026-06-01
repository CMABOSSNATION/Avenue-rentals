// backend/services/otp.js
// OTP generation and SMS delivery via Africa's Talking
const supabase = require('../config/supabase');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create OTP and send SMS via Africa's Talking
 */
async function sendOTP(phone) {
  // Clean up expired OTPs for this phone
  await supabase
    .from('otp_codes')
    .delete()
    .eq('phone', phone)
    .lt('expires_at', new Date().toISOString());

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000);

  // Store OTP
  await supabase.from('otp_codes').insert({
    phone,
    code,
    expires_at: expiresAt.toISOString(),
  });

  // Send SMS
  const message = `Your Nyumba verification code is: ${code}. Valid for ${process.env.OTP_EXPIRES_MINUTES || 10} minutes. Do not share this code.`;

  if (process.env.NODE_ENV === 'development') {
    // Dev mode: just log it
    console.log(`[OTP DEV] Code for ${phone}: ${code}`);
    return { success: true, dev: true };
  }

  // Africa's Talking SMS
  try {
    const AfricasTalking = require('africastalking')({
      apiKey: process.env.AFRICASTALKING_API_KEY,
      username: process.env.AFRICASTALKING_USERNAME,
    });

    const sms = AfricasTalking.SMS;
    await sms.send({
      to: [phone],
      message,
      from: process.env.AFRICASTALKING_SENDER_ID || 'NYUMBA',
    });

    return { success: true };
  } catch (err) {
    console.error('[OTP] SMS send failed:', err.message);
    throw new Error('Failed to send OTP. Please try again.');
  }
}

/**
 * Verify OTP code
 * Returns: { valid: boolean, reason?: string }
 */
async function verifyOTP(phone, code) {
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

  if (!otpRecord) {
    return { valid: false, reason: 'Invalid or expired code' };
  }

  // Mark as used
  await supabase
    .from('otp_codes')
    .update({ used: true })
    .eq('id', otpRecord.id);

  return { valid: true };
}

module.exports = { sendOTP, verifyOTP };
