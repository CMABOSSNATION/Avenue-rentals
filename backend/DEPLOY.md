# 🚀 Nyumba Backend — Cloudflare Workers Deployment Guide

## What Changed From Original

| Original | Workers Version |
|----------|----------------|
| Express | Hono (same syntax) |
| jsonwebtoken | jose (Web Crypto API) |
| socket.io | Supabase Realtime (free) |
| multer | Direct URL uploads (images hosted on Cloudflare Images or Supabase Storage) |
| axios | fetch() (built into Workers) |
| process.env | c.env (per-request env binding) |

---

## Step 1 — Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

---

## Step 2 — Install Dependencies

```bash
cd nyumba-worker
npm install
```

---

## Step 3 — Create KV Namespace (for rate limiting)

```bash
wrangler kv:namespace create RATE_LIMIT_KV
```

Copy the `id` it gives you and paste it into `wrangler.toml`:
```toml
id = "paste-your-id-here"
```

---

## Step 4 — Add Secret Environment Variables

Run each of these commands and paste your values when prompted:

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put JWT_SECRET
wrangler secret put WHATSAPP_API_KEY
wrangler secret put WHATSAPP_NAMESPACE
wrangler secret put AFRICASTALKING_API_KEY
wrangler secret put AFRICASTALKING_USERNAME
wrangler secret put PLATFORM_MOMO_NUMBER
wrangler secret put PLATFORM_MOMO_NAME
```

---

## Step 5 — Test Locally

```bash
npm run dev
# API runs at http://localhost:8787
```

---

## Step 6 — Deploy

```bash
npm run deploy
# Live at: https://nyumba-backend.YOUR-SUBDOMAIN.workers.dev
```

---

## Step 7 — Update Mobile App

In your mobile app's `src/services/api.js`, update the base URL:

```js
const BASE_URL = 'https://nyumba-backend.YOUR-SUBDOMAIN.workers.dev';
```

---

## Step 8 — Enable Supabase Realtime (replaces Socket.io)

In your Supabase dashboard:
1. Go to **Database → Replication**
2. Enable realtime for the `messages` table

In your mobile app's `ChatScreen.js`, replace Socket.io with:

```js
// Replace socket.io connection with:
const channel = supabase
  .channel(`inquiry:${inquiryId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `inquiry_id=eq.${inquiryId}`
  }, (payload) => {
    setMessages(prev => [...prev, payload.new]);
  })
  .subscribe();

// Cleanup
return () => supabase.removeChannel(channel);
```

---

## Free Tier Limits (more than enough for Uganda launch)

| Resource | Free Limit |
|----------|-----------|
| Worker requests | 100,000/day |
| KV reads | 100,000/day |
| KV writes | 1,000/day |
| Supabase DB | 500MB, 2GB transfer |

---

## Viewing Logs

```bash
npm run tail
```
