// mobile/src/screens/tenant/SearchScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, RefreshControl, ActivityIndicator,
  Modal, SafeAreaView,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { usePropertyStore } from '../../store';
import { ALL_DISTRICTS, UGANDA_REGIONS, DISTRICT_TOWNS, PROPERTY_TYPES, formatUGX } from '../../data/ugandaLocations';

const COLORS = { primary: '#1B5E20', gold: '#F9A825', bg: '#F5F5F5' };

function PropertyCard({ item, onPress }) {
  const coverImage = item.property_images?.sort((a, b) => a.order_index - b.order_index)[0]?.url;
  const landlord = item.users;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <FastImage
        style={styles.cardImage}
        source={{ uri: coverImage || 'https://via.placeholder.com/400x200?text=No+Photo', priority: FastImage.priority.normal }}
        resizeMode={FastImage.resizeMode.cover}
      />
      {item.is_featured && (
        <View style={styles.featuredBadge}><Text style={styles.featuredText}>⭐ Featured</Text></View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardPrice}>{formatUGX(item.price)}<Text style={styles.cardPeriod}>/{item.price_period}</Text></Text>
          <View style={styles.typePill}><Text style={styles.typeText}>{item.type?.replace('_', ' ')}</Text></View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.locationRow}>
          <Icon name="map-marker" size={14} color="#666" />
          <Text style={styles.locationText}>
            {item.town || item.parish ? `${item.town || item.parish}, ` : ''}{item.district}
          </Text>
        </View>
        {landlord && (
          <View style={styles.landlordRow}>
            <View style={styles.ratingRow}>
              <Icon name="star" size={13} color={COLORS.gold} />
              <Text style={styles.ratingText}>{landlord.rating?.toFixed(1) || 'New'}</Text>
            </View>
            {landlord.national_id_verified && (
              <View style={styles.verifiedBadge}>
                <Icon name="shield-check" size={12} color="#fff" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen({ navigation }) {
  const {
    properties, filters, loading, refreshing, page, totalPages,
    setFilter, resetFilters, fetchProperties,
  } = usePropertyStore();

  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');

  useEffect(() => {
    fetchProperties(true);
  }, [filters]);

  const onRefresh = useCallback(() => {
    usePropertyStore.setState({ refreshing: true });
    fetchProperties(true);
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && page <= totalPages) fetchProperties(false);
  }, [loading, page, totalPages]);

  const typeFilters = [
    { value: '', label: 'All Types' },
    ...PROPERTY_TYPES,
  ];

  const filteredDistricts = ALL_DISTRICTS.filter(d =>
    d.toLowerCase().includes(districtSearch.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🏠 Nyumba</Text>
          <Text style={styles.headerSub}>Find a house. No broker.</Text>
        </View>
        <TouchableOpacity onPress={resetFilters}>
          <Text style={styles.clearFilters}>Clear filters</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Icon name="magnify" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by area, district, title..."
          value={filters.search}
          onChangeText={v => setFilter('search', v)}
          placeholderTextColor="#aaa"
          returnKeyType="search"
        />
        {filters.search ? (
          <TouchableOpacity onPress={() => setFilter('search', '')}>
            <Icon name="close-circle" size={18} color="#aaa" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {/* Region picker */}
        <TouchableOpacity
          style={[styles.filterChip, filters.region && styles.filterChipActive]}
          onPress={() => setShowRegionModal(true)}
        >
          <Icon name="earth" size={14} color={filters.region ? '#fff' : '#555'} />
          <Text style={[styles.filterText, filters.region && styles.filterTextActive]}>
            {filters.region || 'All Regions'}
          </Text>
        </TouchableOpacity>

        {/* District picker */}
        <TouchableOpacity
          style={[styles.filterChip, filters.district && styles.filterChipActive]}
          onPress={() => setShowDistrictModal(true)}
        >
          <Icon name="map-marker" size={14} color={filters.district ? '#fff' : '#555'} />
          <Text style={[styles.filterText, filters.district && styles.filterTextActive]}>
            {filters.district || 'All Districts'}
          </Text>
        </TouchableOpacity>

        {/* Type filters */}
        {typeFilters.map(t => (
          <TouchableOpacity
            key={t.value}
            style={[styles.filterChip, filters.type === t.value && styles.filterChipActive]}
            onPress={() => setFilter('type', t.value)}
          >
            <Text style={[styles.filterText, filters.type === t.value && styles.filterTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Active filter summary */}
      {(filters.district || filters.region) && (
        <View style={styles.activeSummary}>
          <Icon name="map-marker-check" size={14} color={COLORS.primary} />
          <Text style={styles.activeSummaryText}>
            {[filters.region, filters.district].filter(Boolean).join(' → ')}
          </Text>
          <TouchableOpacity onPress={() => { setFilter('district', ''); setFilter('region', ''); }}>
            <Icon name="close" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Property List */}
      <FlatList
        data={properties}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PropertyCard item={item} onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loading && <ActivityIndicator color={COLORS.primary} style={{ padding: 20 }} />}
        ListEmptyComponent={!loading && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏚️</Text>
            <Text style={styles.emptyTitle}>No properties found</Text>
            <Text style={styles.emptySub}>Try adjusting your filters or search a different area</Text>
          </View>
        )}
      />

      {/* District Modal */}
      <Modal visible={showDistrictModal} animationType="slide" onRequestClose={() => setShowDistrictModal(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select District</Text>
            <TouchableOpacity onPress={() => setShowDistrictModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearch}>
            <Icon name="magnify" size={18} color="#999" />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search districts..."
              value={districtSearch}
              onChangeText={setDistrictSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={[{ name: 'All Districts', region: '' }, ...filteredDistricts.map(d => ({ name: d, region: '' }))]}
            keyExtractor={item => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, filters.district === item.name && styles.modalItemActive]}
                onPress={() => {
                  setFilter('district', item.name === 'All Districts' ? '' : item.name);
                  setDistrictSearch('');
                  setShowDistrictModal(false);
                }}
              >
                <Text style={[styles.modalItemText, filters.district === item.name && styles.modalItemTextActive]}>
                  {item.name}
                </Text>
                {filters.district === item.name && <Icon name="check" size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Region Modal */}
      <Modal visible={showRegionModal} animationType="slide" onRequestClose={() => setShowRegionModal(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Region</Text>
            <TouchableOpacity onPress={() => setShowRegionModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {['All Regions', ...Object.keys(UGANDA_REGIONS)].map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.modalItem, filters.region === r && styles.modalItemActive]}
              onPress={() => {
                setFilter('region', r === 'All Regions' ? '' : r);
                setFilter('district', '');
                setShowRegionModal(false);
              }}
            >
              <View>
                <Text style={[styles.modalItemText, filters.region === r && styles.modalItemTextActive]}>{r}</Text>
                {r !== 'All Regions' && (
                  <Text style={styles.modalItemSub}>{UGANDA_REGIONS[r]?.length} districts</Text>
                )}
              </View>
              {filters.region === r && <Icon name="check" size={18} color={COLORS.primary} />}
            </TouchableOpacity>
          ))}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  clearFilters: { color: '#F9A825', fontSize: 13, fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8, elevation: 2 },
  searchInput: { flex: 1, fontSize: 14, color: '#333', height: 36 },
  filterBar: { marginTop: 8, marginBottom: 2 },
  filterContent: { paddingHorizontal: 12, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#E0E0E0' },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, color: '#555', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  activeSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 12, marginTop: 6, backgroundColor: '#E8F5E9', borderRadius: 8, padding: 8 },
  activeSummaryText: { flex: 1, fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 14, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  cardImage: { width: '100%', height: 185 },
  featuredBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#F9A825', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  featuredText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  cardBody: { padding: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardPrice: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  cardPeriod: { fontSize: 12, fontWeight: '400', color: '#888' },
  typePill: { backgroundColor: '#E8F5E9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'capitalize' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  locationText: { fontSize: 13, color: '#666' },
  landlordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, color: '#666', fontWeight: '600' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  emptySub: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  modalSearch: { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  modalSearchInput: { flex: 1, fontSize: 15, color: '#333' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalItemActive: { backgroundColor: '#E8F5E9' },
  modalItemText: { fontSize: 15, color: '#333', fontWeight: '600' },
  modalItemTextActive: { color: COLORS.primary },
  modalItemSub: { fontSize: 12, color: '#999', marginTop: 2 },
});
