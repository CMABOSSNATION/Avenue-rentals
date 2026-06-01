// backend/services/whatsapp.js
// WhatsApp Business API notifications via 360dialog
const axios = require('axios');

const BASE_URL = 'https://waba.360dialog.io/v1';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'D360-API-KEY': process.env.WHATSAPP_API_KEY,
    'Content-Type': 'application/json',
  },
});

/**
 * Send a WhatsApp template message
 * @param {string} phone - Full international number e.g. +256771234567
 * @param {string} templateName - 360dialog approved template name
 * @param {string[]} params - Template variable values
 */
async function sendTemplate(phone, templateName, params = []) {
  try {
    // Strip + for WhatsApp API
    const to = phone.replace('+', '');

    const payload = {
      to,
      type: 'template',
      template: {
        namespace: process.env.WHATSAPP_NAMESPACE,
        name: templateName,
        language: { code: 'en', policy: 'deterministic' },
        components: params.length > 0 ? [
          {
            type: 'body',
            parameters: params.map(p => ({ type: 'text', text: String(p) })),
          },
        ] : [],
      },
    };

    await client.post('/messages', payload);
    console.log(`[WhatsApp] Sent ${templateName} to ${phone}`);
  } catch (err) {
    // Never crash main flow on WhatsApp failure
    console.error(`[WhatsApp] Failed to send ${templateName} to ${phone}:`, err.message);
  }
}

// ─── Notification Templates ───────────────────────────────────

/**
 * Landlord: New inquiry received
 */
async function notifyLandlordNewInquiry(landlordPhone, landlordName, tenantName, propertyTitle) {
  await sendTemplate(landlordPhone, 'nyumba_new_inquiry', [
    landlordName, tenantName, propertyTitle,
  ]);
}

/**
 * Landlord: Listing approved
 */
async function notifyLandlordListingApproved(landlordPhone, landlordName, propertyTitle) {
  await sendTemplate(landlordPhone, 'nyumba_listing_approved', [
    landlordName, propertyTitle,
  ]);
}

/**
 * Landlord: Listing rejected
 */
async function notifyLandlordListingRejected(landlordPhone, landlordName, propertyTitle, reason) {
  await sendTemplate(landlordPhone, 'nyumba_listing_rejected', [
    landlordName, propertyTitle, reason,
  ]);
}

/**
 * Tenant: Inquiry accepted
 */
async function notifyTenantInquiryAccepted(tenantPhone, tenantName, landlordName, propertyTitle) {
  await sendTemplate(tenantPhone, 'nyumba_inquiry_accepted', [
    tenantName, landlordName, propertyTitle,
  ]);
}

/**
 * Tenant: Inquiry rejected
 */
async function notifyTenantInquiryRejected(tenantPhone, tenantName, landlordName, propertyTitle) {
  await sendTemplate(tenantPhone, 'nyumba_inquiry_rejected', [
    tenantName, landlordName, propertyTitle,
  ]);
}

/**
 * Tenant: Deal confirmed
 */
async function notifyTenantDealConfirmed(tenantPhone, tenantName, propertyTitle, moveInDate) {
  const dateStr = new Date(moveInDate).toLocaleDateString('en-UG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  await sendTemplate(tenantPhone, 'nyumba_deal_confirmed', [
    tenantName, propertyTitle, dateStr,
  ]);
}

/**
 * Send a simple freeform text message (only within 24h window)
 */
async function sendText(phone, message) {
  try {
    const to = phone.replace('+', '');
    await client.post('/messages', {
      to,
      type: 'text',
      text: { body: message },
    });
  } catch (err) {
    console.error('[WhatsApp] sendText failed:', err.message);
  }
}

module.exports = {
  notifyLandlordNewInquiry,
  notifyLandlordListingApproved,
  notifyLandlordListingRejected,
  notifyTenantInquiryAccepted,
  notifyTenantInquiryRejected,
  notifyTenantDealConfirmed,
  sendText,
};
