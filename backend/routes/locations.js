// routes/locations.js — Hono
import { Hono } from 'hono';
import { UGANDA_REGIONS, ALL_DISTRICTS, DISTRICT_TOWNS } from '../config/ugandaLocations.js';

const locations = new Hono();

locations.get('/districts', (c) => {
  const { region } = c.req.query();
  if (region) return c.json(UGANDA_REGIONS[region] || []);
  return c.json(ALL_DISTRICTS.sort());
});

locations.get('/regions', (c) => {
  return c.json(Object.keys(UGANDA_REGIONS));
});

locations.get('/towns/:district', (c) => {
  return c.json(DISTRICT_TOWNS[c.req.param('district')] || []);
});

locations.get('/all', (c) => {
  const result = Object.entries(UGANDA_REGIONS).map(([region, districts]) => ({
    region,
    districts: districts.map(d => ({ name: d, towns: DISTRICT_TOWNS[d] || [] })),
  }));
  return c.json(result);
});

export default locations;
