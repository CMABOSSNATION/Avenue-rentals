# Nyumba Deployment Guide
# Uganda House Rental Marketplace

## Backend — Deploy to Render

1. Push backend/ to a GitHub repo
2. Go to render.com → New Web Service
3. Connect repo, set:
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Environment: Node
4. Add all environment variables from .env.example
5. Free tier is fine to start

## Supabase Setup

1. Go to supabase.com → New Project
2. Go to SQL Editor → paste the full schema.sql
3. Enable Row Level Security (already in schema)
4. Get your SUPABASE_URL and SUPABASE_SERVICE_KEY
5. Create a Storage bucket called "nyumba-media" for photos/videos
   - Make it public

## Africa's Talking (SMS for OTP)

1. Register at africastalking.com
2. Create a Uganda-specific account
3. Add Sender ID "NYUMBA" (needs ATK approval)
4. Get API key and username

## 360dialog (WhatsApp Business)

1. Register at 360dialog.com
2. Submit the WhatsApp Business API application
3. Create message templates:
   - nyumba_new_inquiry
   - nyumba_listing_approved
   - nyumba_listing_rejected
   - nyumba_inquiry_accepted
   - nyumba_inquiry_rejected
   - nyumba_deal_confirmed
4. Each template must be approved by Meta (1-3 days)

## React Native App Build

### Prerequisites
- Android Studio installed
- Java 11+
- Node.js 18+

### Setup
```bash
cd mobile
npm install

# Link vector icons
npx react-native link react-native-vector-icons

# Update API URL in src/services/api.js
# Change BASE_URL to your Render deployment URL
```

### Run on emulator
```bash
npx react-native run-android
```

### Build APK for distribution
```bash
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

## Admin Panel

The admin-panel/index.html is a single HTML file.
- Host it on Netlify or Vercel (drag and drop)
- Or serve it from your Render backend:
  ```js
  app.use('/admin', express.static('admin-panel'));
  ```
- Update API_BASE URL in the HTML file before deploying

## First Admin User

After deploying, to create your admin account:
1. Register normally via the app or phone
2. Go to Supabase → Table Editor → users
3. Find your user, change role to 'admin'
4. Log into admin panel at /admin

## Uganda Phone Numbers for Testing

MTN Uganda (test):
- 0771234567
- 0781234567

Airtel Uganda (test):
- 0701234567
- 0751234567

## Pricing Recommendations (Uganda market)

Single room: UGX 150,000–400,000/month
Double room: UGX 300,000–600,000/month
Apartment: UGX 500,000–2,000,000/month
Bungalow: UGX 1,000,000–5,000,000/month

Platform fee (v1 manual):
- Under UGX 500k/month: UGX 10,000 one-time
- Over UGX 500k/month: UGX 20,000 one-time

## Coverage

All 4 regions covered:
- Central: Kampala, Wakiso, Mukono, Masaka...
- Eastern: Jinja, Mbale, Tororo, Soroti...
- Northern: Gulu, Lira, Arua, Kitgum...
- Western: Mbarara, Fort Portal, Hoima, Kabale...
