# 🏠 Nyumba — Uganda House Rental Marketplace
**"Find a house. No broker."**

A direct landlord-tenant platform eliminating property brokers across Uganda.

---

## Project Structure

```
nyumba/
├── backend/          → Node.js + Express API server
├── mobile/           → React Native Android app
├── admin-panel/      → React web admin dashboard
└── docs/             → Database schema, API docs, setup guides
```

---

## Quick Start

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

### 2. Admin Panel
```bash
cd admin-panel
npm install
npm run dev
```

### 3. React Native App
```bash
cd mobile
npm install
npx react-native run-android
```

---

## Coverage
- **All Uganda districts** — Kampala, Wakiso, Entebbe, Jinja, Mbarara, Gulu, Mbale, Fort Portal, Lira, Masaka, Hoima, Arua, Kabale, Soroti, and more
- **All Uganda mobile networks** — MTN (077/078/076/039) + Airtel (070/075/074)
