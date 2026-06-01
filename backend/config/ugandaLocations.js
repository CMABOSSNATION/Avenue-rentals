// backend/config/ugandaLocations.js
// Complete Uganda districts and regions for Nyumba

const UGANDA_REGIONS = {
  Central: [
    'Kampala', 'Wakiso', 'Mukono', 'Luwero', 'Mityana',
    'Mubende', 'Gomba', 'Kyankwanzi', 'Masaka', 'Rakai',
    'Lyantonde', 'Lwengo', 'Kalangala', 'Bukomansimbi', 'Kalungu',
  ],
  Eastern: [
    'Jinja', 'Mbale', 'Tororo', 'Busia', 'Iganga',
    'Bugiri', 'Kamuli', 'Buyende', 'Namutumba', 'Soroti',
    'Kumi', 'Bukedea', 'Sironko', 'Kapchorwa', 'Bukwo',
    'Manafwa', 'Bulambuli', 'Bududa', 'Mayuge',
  ],
  Northern: [
    'Gulu', 'Lira', 'Arua', 'Kitgum', 'Pader',
    'Apac', 'Dokolo', 'Amolatar', 'Oyam', 'Alebtong',
    'Otuke', 'Nwoya', 'Amuru', 'Adjumani', 'Moyo',
    'Yumbe', 'Koboko', 'Maracha', 'Nebbi', 'Zombo',
    'Pakwach', 'Agago', 'Lamwo', 'Kole', 'Napak',
    'Amudat', 'Nakapiripirit', 'Moroto', 'Kotido', 'Abim', 'Kaabong',
  ],
  Western: [
    'Mbarara', 'Fort Portal', 'Hoima', 'Kabale', 'Kasese',
    'Bushenyi', 'Ntungamo', 'Isingiro', 'Kiruhura', 'Ibanda',
    'Rukungiri', 'Kanungu', 'Rubirizi', 'Mitooma', 'Sheema',
    'Buhweju', 'Kyegegwa', 'Kyenjojo', 'Kamwenge', 'Kabarole',
    'Bundibugyo', 'Ntoroko', 'Kibaale', 'Kakumiro', 'Kagadi',
    'Buliisa', 'Masindi', 'Kiryandongo',
  ],
};

// All districts as a flat array
const ALL_DISTRICTS = Object.values(UGANDA_REGIONS).flat();

// Major towns per district (for sub-location filtering)
const DISTRICT_TOWNS = {
  Kampala: ['Ntinda', 'Kisasi', 'Najjera', 'Kyanja', 'Kololo', 'Nakasero',
            'Kamwokya', 'Mulago', 'Kawempe', 'Ndeeba', 'Makindye', 'Muyenga',
            'Kabalagala', 'Nsambya', 'Kibuli', 'Lubaga', 'Nateete', 'Busega',
            'Kiwatule', 'Naguru', 'Bugolobi', 'Luzira', 'Mbuya', 'Namugongo',
            'Kyaliwajjala', 'Bweyogerere', 'Banda', 'Kireka', 'Mutungo',
            'Kanyanya', 'Kyebando', 'Makerere', 'Wandegeya'],
  Wakiso: ['Entebbe', 'Nansana', 'Kira', 'Makindye Ssabagabo', 'Wakiso Town',
           'Bulindo', 'Nabweru', 'Kasangati', 'Gayaza', 'Matugga', 'Lugazi'],
  Mukono: ['Mukono Town', 'Seeta', 'Goma', 'Lugazi', 'Buikwe'],
  Jinja: ['Jinja City', 'Iganga Road', 'Walukuba', 'Mpumudde', 'Kakira'],
  Mbarara: ['Mbarara City', 'Ruharo', 'Kakoba', 'Nyamitanga', 'Kamukuzi'],
  'Fort Portal': ['Fort Portal City', 'Kabarole', 'Bunyangabu'],
  Gulu: ['Gulu City', 'Pece', 'Layibi', 'Laroo', 'Bardege'],
  Lira: ['Lira City', 'Ojwina', 'Adyel', 'Amach'],
  Arua: ['Arua City', 'Ediofe', 'Mvara', 'River Oli'],
  Mbale: ['Mbale City', 'Namatala', 'Bumalimba'],
  Kabale: ['Kabale Town', 'Kamukuzi', 'Central Division'],
  Hoima: ['Hoima City', 'Kahoora'],
  Masaka: ['Masaka City', 'Nyendo'],
  Soroti: ['Soroti City', 'Arapai'],
  Kasese: ['Kasese Town', 'Nyamwamba', 'Bulembia'],
};

// Uganda phone number validation
const VALID_PHONE_PREFIXES = {
  MTN: ['077', '078', '076', '039'],
  Airtel: ['070', '075', '074'],
};

/**
 * Validate a Uganda phone number
 * Accepts: 07XXXXXXXX, +25607XXXXXXXX, 25607XXXXXXXX
 * Returns: { valid: boolean, normalized: string, network: 'MTN'|'Airtel'|null }
 */
function validateUgandaPhone(phone) {
  // Strip spaces, dashes
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Normalize to 07XXXXXXXX
  if (cleaned.startsWith('+256')) cleaned = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('256')) cleaned = '0' + cleaned.slice(3);

  // Must be 10 digits starting with 0
  if (!/^0\d{9}$/.test(cleaned)) {
    return { valid: false, normalized: null, network: null };
  }

  const prefix = cleaned.slice(0, 3);
  const allPrefixes = [
    ...VALID_PHONE_PREFIXES.MTN,
    ...VALID_PHONE_PREFIXES.Airtel,
  ];

  if (!allPrefixes.includes(prefix)) {
    return { valid: false, normalized: null, network: null };
  }

  const network = VALID_PHONE_PREFIXES.MTN.includes(prefix) ? 'MTN' : 'Airtel';
  const normalized = '+256' + cleaned.slice(1);

  return { valid: true, normalized, network };
}

/**
 * Get region for a district
 */
function getRegion(district) {
  for (const [region, districts] of Object.entries(UGANDA_REGIONS)) {
    if (districts.includes(district)) return region;
  }
  return null;
}

module.exports = {
  UGANDA_REGIONS,
  ALL_DISTRICTS,
  DISTRICT_TOWNS,
  VALID_PHONE_PREFIXES,
  validateUgandaPhone,
  getRegion,
};
