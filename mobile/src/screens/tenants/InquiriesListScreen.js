// mobile/src/screens/tenant/InquiriesListScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import { useAuthStore } from '../../store';

const STATUS_CONFIG = {
  pending:  { color: '#E65100', bg: '#FFF3E0', label: 'Pending', icon: 'clock-outline' },
  accepted: { color: '#1B5E20', bg: '#E8F5E9', label: 'Accepted', icon: 'check-circle-outline' },
  rejected: { color: '#C62828', bg: '#FFEBEE', label: 'Rejected', icon: 'close-circle-outline' },
  closed:   { color: '#546E7A', bg: '#ECEFF1', label: 'Closed', icon: 'lock-outline' },
};

export default function InquiriesListScreen({ navigation }) {
  const { user } = useAuthStore();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data } = await api.get('/inquiries');
      setInquiries(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function renderInquiry({ item }) {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const isLandlord = user?.role === 'landlord';
    const otherParty = isLandlord ? item.tenant : item.landlord;
    const cover = item.properties?.property_images?.sort((a,b) => a.order_index - b.order_index)[0]?.url;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Chat', { inquiryId: item.id, inquiry: item })}
        activeOpacity={0.85}
      >
        {/* Property image */}
        <FastImage
          style={styles.cover}
          source={{ uri: cover || 'https://via.placeholder.com/70' }}
        />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.propTitle} numberOfLines={1}>{item.properties?.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Icon name={status.icon} size={11} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.otherParty}>
            {isLandlord ? '👤 ' : '🏠 '}{otherParty?.name || 'Unknown'}
          </Text>
          <Text style={styles.preview} numberOfLines={1}>{item.message || 'No message'}</Text>
          <View style={styles.cardBottom}>
            <Text style={styles.district}>📍 {item.properties?.district}</Text>
            <Text style={styles.time}>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 {user?.role === 'landlord' ? 'Inquiries' : 'My Chats'}</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#1B5E20" />
      ) : (
        <FlatList
          data={inquiries}
          keyExtractor={item => item.id}
          renderItem={renderInquiry}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#1B5E20']} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySub}>
                {user?.role === 'tenant'
                  ? 'Send an inquiry on any property to start chatting'
                  : 'Inquiries from tenants will appear here'}
              </Text>
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
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
    marginBottom: 10, overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  cover: { width: 78, height: 78 },
  cardBody: { flex: 1, padding: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 },
  propTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginRight: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '700' },
  otherParty: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 2 },
  preview: { fontSize: 12, color: '#888', marginBottom: 5 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  district: { fontSize: 11, color: '#888' },
  time: { fontSize: 11, color: '#aaa' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  emptySub: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
