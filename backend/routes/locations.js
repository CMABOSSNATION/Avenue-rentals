// backend/routes/locations.js
const express = require('express');
const router = express.Router();
const { UGANDA_REGIONS, ALL_DISTRICTS, DISTRICT_TOWNS, getRegion } = require('../config/ugandaLocations');

// GET /locations/districts — All Uganda districts
router.get('/districts', (req, res) => {
  const { region } = req.query;
  if (region) {
    return res.json(UGANDA_REGIONS[region] || []);
  }
  res.json(ALL_DISTRICTS.sort());
});

// GET /locations/regions — All regions
router.get('/regions', (req, res) => {
  res.json(Object.keys(UGANDA_REGIONS));
});

// GET /locations/towns/:district — Towns in a district
router.get('/towns/:district', (req, res) => {
  const district = req.params.district;
  const towns = DISTRICT_TOWNS[district] || [];
  res.json(towns);
});

// GET /locations/all — Full hierarchy
router.get('/all', (req, res) => {
  const result = Object.entries(UGANDA_REGIONS).map(([region, districts]) => ({
    region,
    districts: districts.map(d => ({
      name: d,
      towns: DISTRICT_TOWNS[d] || [],
    })),
  }));
  res.json(result);
});

module.exports = router;
