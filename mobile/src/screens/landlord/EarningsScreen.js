// mobile/src/screens/landlord/LandlordDealsScreen.js
// Re-uses the same DealsScreen but landlord-flavored
export { default } from '../tenant/DealsScreen';

// ─────────────────────────────────────────────────────────────

// mobile/src/screens/landlord/EarningsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import api from '../../services/api';
import { useAuthStore } from '../../store';
import { formatUGX } from '../../data/ugandaLocations';

export function EarningsScreen() {
  const { user } = useAuthStore();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    api.get('/deals').then(({ data }) => { setDeals(data); setLoading(false); }).catch(() => setLoading(false));
  }, []));

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);

  const thisMonthDeals = deals.filter(d => {
    const date = new Date(d.created_at);
    return date >= thisMonthStart && date <= thisMonthEnd && d.status === 'completed';
  });

  const totalThisMonth = thisMonthDeals.reduce((sum, d) => sum + (d.agreed_price || 0), 0);
  const totalAllTime = deals.filter(d => d.status === 'completed').reduce((sum, d) => sum + (d.agreed_price || 0), 0);
  const activeDealCount = deals.filter(d => ['pending', 'confirmed'].includes(d.status)).length;

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#1B5E20" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Earnings</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>📅</Text>
          <Text style={styles.statAmount}>{formatUGX(totalThisMonth)}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🏦</Text>
          <Text style={styles.statAmount}>{formatUGX(totalAllTime)}</Text>
          <Text style={styles.statLabel}>All Time</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🤝</Text>
          <Text style={styles.statAmount}>{activeDealCount}</Text>
          <Text style={styles.statLabel}>Active Deals</Text>
        </View>
      </View>

      {/* MoMo info */}
      {user?.momo_number ? (
        <View style={styles.momoCard}>
          <Icon name="cellphone" size={20} color="#1B5E20" />
          <View style={{ flex: 1 }}>
            <Text style={styles.momoLabel}>Your MoMo ({user.momo_network})</Text>
            <Text style={styles.momoNumber}>{user.momo_number}</Text>
          </View>
          <Text style={styles.momoNote}>Tenants pay directly to this number</Text>
        </View>
      ) : (
        <View style={styles.noMomoCard}>
          <Text style={styles.noMomoText}>⚠️ Add your MoMo number in Profile so tenants can pay you directly</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>All Deals</Text>
      <FlatList
        data={deals}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.dealRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dealProp} numberOfLines={1}>{item.properties?.title}</Text>
              <Text style={styles.dealTenant}>👤 {item.tenant?.name} · {item.properties?.district}</Text>
              <Text style={styles.dealDate}>{format(new Date(item.created_at), 'dd MMM yyyy')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.dealAmount}>{formatUGX(item.agreed_price)}</Text>
              <View style={[styles.dealStatus, { backgroundColor: item.status === 'completed' ? '#E8F5E9' : '#FFF3E0' }]}>
                <Text style={[styles.dealStatusText, { color: item.status === 'completed' ? '#1B5E20' : '#E65100' }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>💰</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#333' }}>No deals yet</Text>
            <Text style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Earnings appear here when deals are confirmed</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#1B5E20', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 10, padding: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', elevation: 2 },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statAmount: { fontSize: 14, fontWeight: '800', color: '#1B5E20', textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' },
  momoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E8F5E9', marginHorizontal: 14, borderRadius: 12, padding: 14, marginBottom: 14 },
  momoLabel: { fontSize: 12, color: '#888', fontWeight: '600' },
  momoNumber: { fontSize: 16, fontWeight: '800', color: '#1B5E20' },
  momoNote: { fontSize: 11, color: '#888', textAlign: 'right', flex: 1 },
  noMomoCard: { backgroundColor: '#FFF8E1', marginHorizontal: 14, borderRadius: 10, padding: 12, marginBottom: 14 },
  noMomoText: { fontSize: 13, color: '#E65100', lineHeight: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#333', marginHorizontal: 16, marginBottom: 8 },
  dealRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, elevation: 1 },
  dealProp: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  dealTenant: { fontSize: 12, color: '#888', marginBottom: 2 },
  dealDate: { fontSize: 11, color: '#aaa' },
  dealAmount: { fontSize: 15, fontWeight: '800', color: '#1B5E20', marginBottom: 4 },
  dealStatus: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  dealStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingTop: 40 },
});

export default EarningsScreen;
