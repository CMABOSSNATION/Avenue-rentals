// services/whatsapp.js — fetch() instead of axios (Workers compatible)

async function sendTemplate(phone, templateName, params = [], env) {
  try {
    const to = phone.replace('+', '');
    const payload = {
      to,
      type: 'template',
      template: {
        namespace: env.WHATSAPP_NAMESPACE,
        name: templateName,
        language: { code: 'en', policy: 'deterministic' },
        components: params.length > 0 ? [{
          type: 'body',
          parameters: params.map(p => ({ type: 'text', text: String(p) })),
        }] : [],
      },
    };

    await fetch('https://waba.360dialog.io/v1/messages', {
      method: 'POST',
      headers: {
        'D360-API-KEY': env.WHATSAPP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`[WhatsApp] Sent ${templateName} to ${phone}`);
  } catch (err) {
    console.error(`[WhatsApp] Failed to send ${templateName} to ${phone}:`, err.message);
  }
}

export async function notifyLandlordNewInquiry(landlordPhone, landlordName, tenantName, propertyTitle, env) {
  await sendTemplate(landlordPhone, 'nyumba_new_inquiry', [landlordName, tenantName, propertyTitle], env);
}

export async function notifyLandlordListingApproved(landlordPhone, landlordName, propertyTitle, env) {
  await sendTemplate(landlordPhone, 'nyumba_listing_approved', [landlordName, propertyTitle], env);
}

export async function notifyLandlordListingRejected(landlordPhone, landlordName, propertyTitle, reason, env) {
  await sendTemplate(landlordPhone, 'nyumba_listing_rejected', [landlordName, propertyTitle, reason], env);
}

export async function notifyTenantInquiryAccepted(tenantPhone, tenantName, landlordName, propertyTitle, env) {
  await sendTemplate(tenantPhone, 'nyumba_inquiry_accepted', [tenantName, landlordName, propertyTitle], env);
}

export async function notifyTenantInquiryRejected(tenantPhone, tenantName, landlordName, propertyTitle, env) {
  await sendTemplate(tenantPhone, 'nyumba_inquiry_rejected', [tenantName, landlordName, propertyTitle], env);
}

export async function notifyTenantDealConfirmed(tenantPhone, tenantName, propertyTitle, moveInDate, env) {
  const dateStr = new Date(moveInDate).toLocaleDateString('en-UG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  await sendTemplate(tenantPhone, 'nyumba_deal_confirmed', [tenantName, propertyTitle, dateStr], env);
}

export async function sendText(phone, message, env) {
  try {
    const to = phone.replace('+', '');
    await fetch('https://waba.360dialog.io/v1/messages', {
      method: 'POST',
      headers: {
        'D360-API-KEY': env.WHATSAPP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, type: 'text', text: { body: message } }),
    });
  } catch (err) {
    console.error('[WhatsApp] sendText failed:', err.message);
  }
}
