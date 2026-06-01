// mobile/src/screens/tenant/DealsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { useAuthStore } from '../../store';
import { formatUGX } from '../../data/ugandaLocations';
import { format } from 'date-fns';

const DEAL_STATUS = {
  pending:   { label: 'Pending Payment', color: '#E65100', bg: '#FFF3E0', icon: 'clock-outline' },
  paid:      { label: 'Payment Received', color: '#1565C0', bg: '#E3F2FD', icon: 'cash-check' },
  confirmed: { label: 'Moved In ✅', color: '#1B5E20', bg: '#E8F5E9', icon: 'home-check' },
  disputed:  { label: 'Disputed ⚠️', color: '#B71C1C', bg: '#FFEBEE', icon: 'alert-circle' },
  completed: { label: 'Completed 🎉', color: '#1B5E20', bg: '#E8F5E9', icon: 'check-all' },
};

export default function DealsScreen({ navigation }) {
  const { user } = useAuthStore();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data } = await api.get('/deals');
      setDeals(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function confirmMoveIn(dealId) {
    Alert.alert(
      'Confirm Move-In',
      'By confirming, you are saying you have moved into the property. This will mark the deal as active.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I Moved In',
          style: 'default',
          onPress: async () => {
            try {
              await api.put(`/deals/${dealId}/confirm`);
              load();
              Alert.alert('🎉 Welcome home!', 'Your move-in has been confirmed.');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to confirm');
            }
          },
        },
      ]
    );
  }

  function renderDeal({ item }) {
    const statusCfg = DEAL_STATUS[item.status] || DEAL_STATUS.pending;
    const cover = item.properties?.property_images?.sort((a,b) => a.order_index-b.order_index)[0]?.url;
    const isLandlord = user?.role === 'landlord';
    const otherParty = isLandlord ? item.tenant : item.landlord;

    return (
      <View style={styles.card}>
        {cover && <FastImage style={styles.cardImg} source={{ uri: cover }} resizeMode="cover" />}
        <View style={styles.cardBody}>
          <Text style={styles.propTitle} numberOfLines={1}>{item.properties?.title}</Text>
          <Text style={styles.propLocation}>📍 {item.properties?.district}</Text>

          <View style={styles.row}>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Icon name={statusCfg.icon} size={13} color={statusCfg.color} />
              <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Agreed Rent</Text>
            <Text style={styles.detailValue}>{formatUGX(item.agreed_price)}/mo</Text>
          </View>

          {item.move_in_date && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Move-in Date</Text>
              <Text style={styles.detailValue}>{format(new Date(item.move_in_date), 'dd MMM yyyy')}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{isLandlord ? 'Tenant' : 'Landlord'}</Text>
            <Text style={styles.detailValue}>{otherParty?.name}</Text>
          </View>

          {/* Payment info for pending deals */}
          {item.status === 'pending' && item.platform_fee > 0 && (
            <View style={styles.paymentBox}>
              <Text style={styles.paymentTitle}>💳 Platform Fee Required</Text>
              <Text style={styles.paymentAmount}>{formatUGX(item.platform_fee)}</Text>
              <Text style={styles.paymentInstructions}>
                Send to: {process.env.PLATFORM_MOMO_NUMBER || 'Nyumba Platform'}{'\n'}
                Reference: NYUMBA-{item.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {item.status === 'pending' && user?.role === 'tenant' && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => confirmMoveIn(item.id)}>
                <Icon name="home-check" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Confirm I Moved In</Text>
              </TouchableOpacity>
            )}

            {['confirmed', 'completed'].includes(item.status) && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#F9A825' }]}
                onPress={() => navigation.navigate('Review', { dealId: item.id })}
              >
                <Icon name="star" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Leave Review</Text>
              </TouchableOpacity>
            )}

            {!['completed', 'disputed'].includes(item.status) && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#E53935' }]}
                onPress={() => {
                  Alert.alert('Raise Dispute', 'Contact support if there is a problem with this deal.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Raise Dispute', style: 'destructive', onPress: async () => {
                      await api.put(`/deals/${item.id}/dispute`, { reason: 'Tenant initiated dispute' });
                      load();
                    }},
                  ]);
                }}
              >
                <Icon name="alert" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Raise Dispute</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤝 My Deals</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#1B5E20" />
      ) : (
        <FlatList
          data={deals}
          keyExtractor={item => item.id}
          renderItem={renderDeal}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#1B5E20']} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>🤝</Text>
              <Text style={styles.emptyTitle}>No deals yet</Text>
              <Text style={styles.emptySub}>Deals are created when a landlord confirms you as their tenant</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#1B5E20', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  list: { padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 14, overflow: 'hidden', elevation: 3 },
  cardImg: { width: '100%', height: 140 },
  cardBody: { padding: 14 },
  propTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 3 },
  propLocation: { fontSize: 13, color: '#888', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  detailLabel: { fontSize: 13, color: '#888' },
  detailValue: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  paymentBox: { backgroundColor: '#FFF8E1', borderRadius: 10, padding: 12, marginTop: 12 },
  paymentTitle: { fontSize: 13, fontWeight: '700', color: '#E65100', marginBottom: 4 },
  paymentAmount: { fontSize: 18, fontWeight: '800', color: '#1B5E20', marginBottom: 4 },
  paymentInstructions: { fontSize: 12, color: '#555', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1B5E20', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  emptySub: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
