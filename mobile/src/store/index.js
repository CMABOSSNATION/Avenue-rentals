// mobile/src/store/index.js
import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import api from '../services/api';

const storage = new MMKV({ id: 'nyumba-store' });

// ─── Auth Store ───────────────────────────────────────────────
export const useAuthStore = create((set, get) => ({
  user: null,
  token: storage.getString('token') || null,
  refreshToken: storage.getString('refreshToken') || null,
  isLoading: true,

  setAuth: ({ user, token, refreshToken }) => {
    storage.set('token', token);
    storage.set('refreshToken', refreshToken);
    set({ user, token, refreshToken });
  },

  updateUser: (updates) => set(state => ({
    user: { ...state.user, ...updates },
  })),

  logout: () => {
    storage.delete('token');
    storage.delete('refreshToken');
    set({ user: null, token: null, refreshToken: null });
  },

  setLoading: (isLoading) => set({ isLoading }),

  async loadUser() {
    const token = storage.getString('token');
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data } = await api.get('/users/me');
      set({ user: data, isLoading: false });
    } catch {
      storage.delete('token');
      set({ user: null, token: null, isLoading: false });
    }
  },
}));

// ─── Properties Store ─────────────────────────────────────────
export const usePropertyStore = create((set, get) => ({
  properties: [],
  savedIds: [],
  filters: {
    district: '',
    region: '',
    town: '',
    type: '',
    min_price: '',
    max_price: '',
    search: '',
  },
  page: 1,
  totalPages: 1,
  loading: false,
  refreshing: false,

  setFilter: (key, value) => set(state => ({
    filters: { ...state.filters, [key]: value },
    page: 1,
    properties: [],
  })),

  resetFilters: () => set({
    filters: { district: '', region: '', town: '', type: '', min_price: '', max_price: '', search: '' },
    page: 1,
    properties: [],
  }),

  async fetchProperties(reset = false) {
    const { filters, page, loading } = get();
    if (loading) return;
    set({ loading: true });

    try {
      const params = new URLSearchParams({
        page: reset ? 1 : page,
        limit: 20,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      });

      const { data } = await api.get(`/properties?${params}`);

      set(state => ({
        properties: reset ? data.properties : [...state.properties, ...data.properties],
        page: reset ? 2 : state.page + 1,
        totalPages: data.totalPages,
        loading: false,
        refreshing: false,
      }));
    } catch (err) {
      set({ loading: false, refreshing: false });
    }
  },

  toggleSave: (propertyId) => set(state => ({
    savedIds: state.savedIds.includes(propertyId)
      ? state.savedIds.filter(id => id !== propertyId)
      : [...state.savedIds, propertyId],
  })),
}));

// ─── Chat/Inquiries Store ─────────────────────────────────────
export const useChatStore = create((set, get) => ({
  inquiries: [],
  activeInquiry: null,
  messages: {},
  unreadCounts: {},

  setInquiries: (inquiries) => set({ inquiries }),

  setActiveInquiry: (inquiry) => set({ activeInquiry: inquiry }),

  setMessages: (inquiryId, messages) => set(state => ({
    messages: { ...state.messages, [inquiryId]: messages },
  })),

  addMessage: (inquiryId, message) => set(state => ({
    messages: {
      ...state.messages,
      [inquiryId]: [...(state.messages[inquiryId] || []), message],
    },
  })),

  setUnread: (inquiryId, count) => set(state => ({
    unreadCounts: { ...state.unreadCounts, [inquiryId]: count },
  })),

  get totalUnread() {
    return Object.values(get().unreadCounts).reduce((sum, c) => sum + c, 0);
  },
}));

// ─── Uganda Locations Store ───────────────────────────────────
export const useLocationStore = create((set) => ({
  regions: [],
  districtsByRegion: {},
  townsByDistrict: {},
  loaded: false,

  async load() {
    try {
      const { data } = await api.get('/locations/all');
      const districtsByRegion = {};
      const townsByDistrict = {};
      const regions = data.map(r => r.region);

      data.forEach(r => {
        districtsByRegion[r.region] = r.districts.map(d => d.name);
        r.districts.forEach(d => {
          townsByDistrict[d.name] = d.towns;
        });
      });

      set({ regions, districtsByRegion, townsByDistrict, loaded: true });
    } catch (err) {
      console.warn('Failed to load locations:', err.message);
    }
  },
}));
