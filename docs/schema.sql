-- ============================================================
--  NYUMBA — Complete Database Schema
--  Uganda House Rental Marketplace
--  Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- REFERENCE DATA — Uganda Districts & Regions
-- ============================================================

CREATE TABLE uganda_districts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  region VARCHAR(50) NOT NULL CHECK (region IN (
    'Central', 'Eastern', 'Northern', 'Western'
  )),
  is_active BOOLEAN DEFAULT true
);

INSERT INTO uganda_districts (name, region) VALUES
-- Central Region
('Kampala', 'Central'),
('Wakiso', 'Central'),
('Mukono', 'Central'),
('Luwero', 'Central'),
('Mityana', 'Central'),
('Mubende', 'Central'),
('Butebo', 'Central'),
('Gomba', 'Central'),
('Kyankwanzi', 'Central'),
('Masaka', 'Central'),
('Rakai', 'Central'),
('Lyantonde', 'Central'),
('Lwengo', 'Central'),
('Kalangala', 'Central'),
('Bukomansimbi', 'Central'),
('Kalungu', 'Central'),
-- Eastern Region
('Jinja', 'Eastern'),
('Mbale', 'Eastern'),
('Tororo', 'Eastern'),
('Busia', 'Eastern'),
('Iganga', 'Eastern'),
('Bugiri', 'Eastern'),
('Kamuli', 'Eastern'),
('Buyende', 'Eastern'),
('Namutumba', 'Eastern'),
('Soroti', 'Eastern'),
('Kumi', 'Eastern'),
('Bukedea', 'Eastern'),
('Sironko', 'Eastern'),
('Kapchorwa', 'Eastern'),
('Bukwo', 'Eastern'),
('Manafwa', 'Eastern'),
('Bulambuli', 'Eastern'),
('Bududa', 'Eastern'),
('Mayuge', 'Eastern'),
-- Northern Region
('Gulu', 'Northern'),
('Lira', 'Northern'),
('Arua', 'Northern'),
('Kitgum', 'Northern'),
('Pader', 'Northern'),
('Apac', 'Northern'),
('Dokolo', 'Northern'),
('Amolatar', 'Northern'),
('Oyam', 'Northern'),
('Alebtong', 'Northern'),
('Otuke', 'Northern'),
('Nwoya', 'Northern'),
('Amuru', 'Northern'),
('Adjumani', 'Northern'),
('Moyo', 'Northern'),
('Yumbe', 'Northern'),
('Koboko', 'Northern'),
('Maracha', 'Northern'),
('Nebbi', 'Northern'),
('Zombo', 'Northern'),
('Pakwach', 'Northern'),
('Agago', 'Northern'),
('Lamwo', 'Northern'),
('Kole', 'Northern'),
('Napak', 'Northern'),
('Amudat', 'Northern'),
('Nakapiripirit', 'Northern'),
('Moroto', 'Northern'),
('Kotido', 'Northern'),
('Abim', 'Northern'),
('Kaabong', 'Northern'),
-- Western Region
('Mbarara', 'Western'),
('Fort Portal', 'Western'),
('Hoima', 'Western'),
('Kabale', 'Western'),
('Kasese', 'Western'),
('Bushenyi', 'Western'),
('Ntungamo', 'Western'),
('Isingiro', 'Western'),
('Kiruhura', 'Western'),
('Ibanda', 'Western'),
('Mbarara', 'Western'),
('Rukungiri', 'Western'),
('Kanungu', 'Western'),
('Rubirizi', 'Western'),
('Mitooma', 'Western'),
('Sheema', 'Western'),
('Buhweju', 'Western'),
('Kyegegwa', 'Western'),
('Kyenjojo', 'Western'),
('Kamwenge', 'Western'),
('Kabarole', 'Western'),
('Bundibugyo', 'Western'),
('Ntoroko', 'Western'),
('Kibaale', 'Western'),
('Kakumiro', 'Western'),
('Kagadi', 'Western'),
('Buliisa', 'Western'),
('Masindi', 'Western'),
('Kiryandongo', 'Western');

-- Common Kampala parishes (for granular Kampala search)
CREATE TABLE kampala_parishes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  division VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO kampala_parishes (name, division) VALUES
('Ntinda', 'Nakawa'), ('Kisasi', 'Nakawa'), ('Najjera', 'Nakawa'),
('Kyanja', 'Nakawa'), ('Kiwatule', 'Nakawa'), ('Naguru', 'Nakawa'),
('Bugolobi', 'Nakawa'), ('Luzira', 'Nakawa'), ('Mbuya', 'Nakawa'),
('Namugongo', 'Nakawa'), ('Kyaliwajjala', 'Nakawa'),
('Bweyogerere', 'Nakawa'), ('Banda', 'Nakawa'), ('Kireka', 'Nakawa'),
('Mutungo', 'Nakawa'), ('Kinawataka', 'Nakawa'),
('Kololo', 'Central'), ('Nakasero', 'Central'), ('Old Kampala', 'Central'),
('Kamwokya', 'Central'), ('Mulago', 'Central'), ('Katwe', 'Central'),
('Kisenyi', 'Central'), ('Namirembe', 'Central'),
('Mengo', 'Kawempe'), ('Bwaise', 'Kawempe'), ('Mulago North', 'Kawempe'),
('Kawempe', 'Kawempe'), ('Kyebando', 'Kawempe'), ('Kanyanya', 'Kawempe'),
('Kazo', 'Kawempe'), ('Ttula', 'Kawempe'), ('Mpererwe', 'Kawempe'),
('Makerere', 'Kawempe'), ('Wandegeya', 'Kawempe'),
('Ndeeba', 'Makindye'), ('Makindye', 'Makindye'), ('Kibuye', 'Makindye'),
('Buziga', 'Makindye'), ('Muyenga', 'Makindye'), ('Ggaba', 'Makindye'),
('Kabalagala', 'Makindye'), ('Nsambya', 'Makindye'), ('Kansanga', 'Makindye'),
('Kibuli', 'Makindye'), ('Salama Road', 'Makindye'),
('Lubaga', 'Lubaga'), ('Namirembe', 'Lubaga'), ('Lungujja', 'Lubaga'),
('Kasubi', 'Lubaga'), ('Ndeeba', 'Lubaga'), ('Rubaga', 'Lubaga'),
('Nateete', 'Lubaga'), ('Busega', 'Lubaga'), ('Mutundwe', 'Lubaga');

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('landlord', 'tenant', 'admin')),
  avatar_url TEXT,
  national_id_url TEXT,
  national_id_selfie_url TEXT,
  national_id_verified BOOLEAN DEFAULT false,
  national_id_rejected_reason TEXT,
  momo_number VARCHAR(20),
  momo_name VARCHAR(100),
  momo_network VARCHAR(10) CHECK (momo_network IN ('MTN', 'Airtel')),
  district VARCHAR(100),                    -- Which district they operate in
  is_verified BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  rating DECIMAL(2,1) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  device_fingerprint TEXT,
  push_token TEXT,
  whatsapp_optin BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- PROPERTIES
-- ============================================================

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'single_room', 'double_room', 'apartment',
    'bungalow', 'mansion', 'shop', 'office'
  )),
  price INTEGER NOT NULL,                   -- in UGX
  price_period VARCHAR(20) DEFAULT 'month' CHECK (price_period IN ('month', 'year')),
  
  -- Location — Uganda-wide
  district VARCHAR(100) NOT NULL,           -- e.g. "Kampala", "Mbarara", "Gulu"
  region VARCHAR(50),                        -- e.g. "Central", "Western"
  town VARCHAR(100),                         -- e.g. "Entebbe", "Jinja Town"
  parish VARCHAR(100),                       -- e.g. "Ntinda", "Ruharo"
  area VARCHAR(100),                         -- e.g. "Behind Shell station"
  full_address TEXT,
  landmark TEXT,                             -- "Near Makerere University gate"
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  amenities JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'active', 'taken', 'suspended', 'rejected'
  )),
  rejection_reason TEXT,
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMP,
  views INTEGER DEFAULT 0,
  inquiries_count INTEGER DEFAULT 0,
  video_url TEXT,
  video_verified BOOLEAN DEFAULT false,
  report_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_properties_district ON properties(district);
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_type ON properties(type);
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_properties_landlord ON properties(landlord_id);

-- ============================================================
-- PROPERTY IMAGES
-- ============================================================

CREATE TABLE property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SAVED / BOOKMARKS
-- ============================================================

CREATE TABLE saved_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- ============================================================
-- INQUIRIES
-- ============================================================

CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
  landlord_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'rejected', 'closed'
  )),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- MESSAGES
-- ============================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image')),
  image_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_inquiry ON messages(inquiry_id);

-- ============================================================
-- DEALS
-- ============================================================

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  tenant_id UUID REFERENCES users(id),
  landlord_id UUID REFERENCES users(id),
  inquiry_id UUID REFERENCES inquiries(id),
  agreed_price INTEGER NOT NULL,
  platform_fee INTEGER DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'manual_momo',
  payment_reference TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'paid', 'confirmed', 'disputed', 'completed'
  )),
  move_in_date DATE,
  dispute_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  reviewer_id UUID REFERENCES users(id),
  reviewee_id UUID REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(deal_id, reviewer_id)
);

-- ============================================================
-- REPORTS
-- ============================================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id),
  property_id UUID REFERENCES properties(id),
  reason VARCHAR(100) NOT NULL CHECK (reason IN (
    'Fake listing',
    'Wrong location',
    'Broker not landlord',
    'Scam',
    'Misleading photos',
    'Property already taken',
    'Other'
  )),
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'dismissed', 'warned', 'suspended', 'banned'
  )),
  admin_note TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- BEHAVIORAL FLAGS
-- ============================================================

CREATE TABLE behavioral_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  flag_type VARCHAR(100) NOT NULL,
  details TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- BLACKLIST
-- ============================================================

CREATE TABLE blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  device_fingerprint TEXT,
  reason TEXT,
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- OTP (One-Time Passwords)
-- ============================================================

CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS LOG
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(200),
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  sent_whatsapp BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ADMIN ACTIVITY LOG
-- ============================================================

CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action VARCHAR(200) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (Supabase)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile, others can read public profiles
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Public profiles readable" ON users
  FOR SELECT USING (true);

-- Properties: active ones are public, landlords manage their own
CREATE POLICY "Active properties are public" ON properties
  FOR SELECT USING (status = 'active');

CREATE POLICY "Landlords manage own properties" ON properties
  FOR ALL USING (auth.uid() = landlord_id);

-- Inquiries: only participants can see
CREATE POLICY "Inquiry participants only" ON inquiries
  FOR ALL USING (auth.uid() = tenant_id OR auth.uid() = landlord_id);

-- Messages: only inquiry participants
CREATE POLICY "Message participants only" ON messages
  FOR ALL USING (
    inquiry_id IN (
      SELECT id FROM inquiries
      WHERE tenant_id = auth.uid() OR landlord_id = auth.uid()
    )
  );

-- Saved properties: own only
CREATE POLICY "Own saved properties" ON saved_properties
  FOR ALL USING (auth.uid() = user_id);
