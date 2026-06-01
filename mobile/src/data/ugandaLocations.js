// mobile/src/data/ugandaLocations.js
// Embedded Uganda locations — no API call needed, works offline

export const UGANDA_REGIONS = {
  Central: [
    'Kampala', 'Wakiso', 'Mukono', 'Luwero', 'Mityana',
    'Mubende', 'Gomba', 'Masaka', 'Rakai', 'Lyantonde',
    'Lwengo', 'Kalangala', 'Bukomansimbi', 'Kalungu',
  ],
  Eastern: [
    'Jinja', 'Mbale', 'Tororo', 'Busia', 'Iganga',
    'Bugiri', 'Kamuli', 'Soroti', 'Kumi', 'Sironko',
    'Kapchorwa', 'Bukwo', 'Manafwa', 'Bududa', 'Mayuge',
  ],
  Northern: [
    'Gulu', 'Lira', 'Arua', 'Kitgum', 'Pader',
    'Apac', 'Oyam', 'Alebtong', 'Nwoya', 'Amuru',
    'Adjumani', 'Moyo', 'Yumbe', 'Koboko', 'Nebbi',
    'Zombo', 'Pakwach', 'Agago', 'Lamwo', 'Moroto', 'Kotido',
  ],
  Western: [
    'Mbarara', 'Fort Portal', 'Hoima', 'Kabale', 'Kasese',
    'Bushenyi', 'Ntungamo', 'Ibanda', 'Rukungiri', 'Kanungu',
    'Rubirizi', 'Mitooma', 'Sheema', 'Kyegegwa', 'Kyenjojo',
    'Kamwenge', 'Kabarole', 'Bundibugyo', 'Masindi', 'Kiryandongo',
  ],
};

export const ALL_DISTRICTS = Object.values(UGANDA_REGIONS).flat().sort();

export const DISTRICT_TOWNS = {
  Kampala: [
    'Ntinda', 'Kisasi', 'Najjera', 'Kyanja', 'Kololo', 'Nakasero',
    'Kamwokya', 'Kawempe', 'Ndeeba', 'Makindye', 'Muyenga', 'Kabalagala',
    'Nsambya', 'Kibuli', 'Lubaga', 'Nateete', 'Busega', 'Kiwatule',
    'Naguru', 'Bugolobi', 'Luzira', 'Mbuya', 'Namugongo', 'Kyaliwajjala',
    'Bweyogerere', 'Banda', 'Kireka', 'Mutungo', 'Kanyanya', 'Makerere',
    'Wandegeya', 'Katwe', 'Old Kampala', 'Mulago',
  ],
  Wakiso: ['Entebbe', 'Nansana', 'Kira', 'Kasangati', 'Gayaza', 'Matugga', 'Namugongo', 'Bulindo'],
  Mukono: ['Mukono Town', 'Seeta', 'Goma', 'Lugazi', 'Namataba'],
  Masaka: ['Masaka City', 'Nyendo', 'Kimanya', 'Kimaanya-Kabonera'],
  Jinja: ['Jinja City', 'Walukuba', 'Mpumudde', 'Kakira', 'Bugembe'],
  Mbarara: ['Mbarara City', 'Ruharo', 'Kakoba', 'Nyamitanga', 'Kamukuzi', 'Biharwe'],
  'Fort Portal': ['Fort Portal City', 'Kabarole', 'Bunyangabu', 'Kyababona'],
  Gulu: ['Gulu City', 'Pece', 'Layibi', 'Laroo', 'Bardege', 'Lacor'],
  Lira: ['Lira City', 'Ojwina', 'Adyel', 'Amach', 'Barr'],
  Arua: ['Arua City', 'Ediofe', 'Mvara', 'River Oli', 'Pajulu'],
  Mbale: ['Mbale City', 'Namatala', 'Bumalimba', 'Industrial Division'],
  Kabale: ['Kabale Town', 'Kamukuzi', 'Central Division', 'Kitabi'],
  Hoima: ['Hoima City', 'Kahoora', 'Bujumbura', 'Mparo'],
  Soroti: ['Soroti City', 'Arapai', 'Opeta'],
  Kasese: ['Kasese Town', 'Nyamwamba', 'Bulembia', 'Bwera'],
};

export const PROPERTY_TYPES = [
  { value: 'single_room', label: 'Single Room' },
  { value: 'double_room', label: 'Double Room' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'mansion', label: 'Mansion' },
  { value: 'shop', label: 'Shop/Commercial' },
  { value: 'office', label: 'Office Space' },
];

export const AMENITIES_LIST = [
  { key: 'water', label: 'Water Supply', icon: '💧' },
  { key: 'electricity', label: 'Electricity (UMEME)', icon: '⚡' },
  { key: 'parking', label: 'Parking Space', icon: '🚗' },
  { key: 'security_guard', label: 'Security Guard', icon: '💂' },
  { key: 'fence', label: 'Fenced Compound', icon: '🏗️' },
  { key: 'internet', label: 'Internet / WiFi', icon: '📶' },
  { key: 'generator', label: 'Generator Backup', icon: '⚙️' },
  { key: 'tiled_floors', label: 'Tiled Floors', icon: '🪟' },
  { key: 'ceiling', label: 'Ceiling Board', icon: '🏠' },
  { key: 'indoor_bathroom', label: 'Indoor Bathroom', icon: '🚿' },
  { key: 'outdoor_bathroom', label: 'Outdoor Bathroom', icon: '🪣' },
  { key: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { key: 'sitting_room', label: 'Sitting Room', icon: '🛋️' },
  { key: 'wardrobe', label: 'Built-in Wardrobe', icon: '👔' },
  { key: 'borehole', label: 'Borehole Water', icon: '🪣' },
  { key: 'solar', label: 'Solar Power', icon: '☀️' },
];

export const REPORT_REASONS = [
  'Fake listing',
  'Wrong location',
  'Broker not landlord',
  'Scam',
  'Misleading photos',
  'Property already taken',
  'Other',
];

/**
 * Validate Uganda phone number
 */
export function validateUgandaPhone(phone) {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+256')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('256')) cleaned = '0' + cleaned.slice(3);

  if (!/^0\d{9}$/.test(cleaned)) return { valid: false };

  const prefix = cleaned.slice(0, 3);
  const mtn = ['077', '078', '076', '039'];
  const airtel = ['070', '075', '074'];
  const all = [...mtn, ...airtel];

  if (!all.includes(prefix)) return { valid: false };

  const network = mtn.includes(prefix) ? 'MTN' : 'Airtel';
  const normalized = '+256' + cleaned.slice(1);
  const display = '0' + cleaned.slice(1);

  return { valid: true, normalized, display, network };
}

/**
 * Format UGX price
 */
export function formatUGX(amount) {
  if (!amount) return 'UGX 0';
  return 'UGX ' + Number(amount).toLocaleString('en-UG');
}

/**
 * Format price per period
 */
export function formatPrice(price, period = 'month') {
  return `${formatUGX(price)} / ${period}`;
}
