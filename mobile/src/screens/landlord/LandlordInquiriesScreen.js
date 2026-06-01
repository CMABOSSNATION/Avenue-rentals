// mobile/src/screens/landlord/LandlordInquiriesScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';

export default function LandlordInquiriesScreen({ navigation }) {
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

  async function handleAction(inquiryId, action) {
    const word = action === 'accept' ? 'Accept' : 'Reject';
    Alert.alert(`${word} Inquiry`, `Are you sure you want to ${action} this inquiry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: word,
        style: action === 'reject' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await api.put(`/inquiries/${inquiryId}/${action}`);
            load();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Action failed');
          }
        },
      },
    ]);
  }

  function renderItem({ item }) {
    const cover = item.properties?.property_images?.sort((a,b) => a.order_index - b.order_index)[0]?.url;
    const isPending = item.status === 'pending';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FastImage style={styles.tenantAvatar} source={{ uri: item.tenant?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.tenant?.name || 'T')}&background=1B5E20&color=fff` }} />
          <View style={styles.tenantInfo}>
            <Text style={styles.tenantName}>{item.tenant?.name}</Text>
            <View style={styles.ratingRow}>
              <Icon name="star" size={12} color="#F9A825" />
              <Text style={styles.ratingText}>{item.tenant?.rating?.toFixed(1) || 'New'}</Text>
            </View>
          </View>
          <Text style={styles.time}>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</Text>
        </View>

        <View style={styles.propRow}>
          {cover && <FastImage style={styles.propThumb} source={{ uri: cover }} />}
          <View style={styles.propInfo}>
            <Text style={styles.propTitle} numberOfLines={1}>{item.properties?.title}</Text>
            <Text style={styles.propLoc}>📍 {item.properties?.district}, Uganda</Text>
          </View>
        </View>

        <View style={styles.msgBox}>
          <Text style={styles.msgText}>"{item.message}"</Text>
        </View>

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAction(item.id, 'accept')}>
              <Icon name="check" size={16} color="#fff" />
              <Text style={styles.acceptBtnText}>Accept & Start Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(item.id, 'reject')}>
              <Icon name="close" size={16} color="#E53935" />
              <Text style={styles.rejectBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'accepted' && (
          <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate('Chat', { inquiryId: item.id, inquiry: item })}>
            <Icon name="chat" size={16} color="#fff" />
            <Text style={styles.chatBtnText}>Open Chat</Text>
          </TouchableOpacity>
        )}

        {item.status === 'rejected' && (
          <View style={styles.rejectedNote}>
            <Text style={styles.rejectedText}>❌ You declined this inquiry</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📩 Inquiries</Text>
        <Text style={styles.headerSub}>{inquiries.filter(i => i.status === 'pending').length} pending</Text>
      </View>
      {loading ? <ActivityIndicator style={{ flex: 1 }} color="#1B5E20" /> : (
        <FlatList
          data={inquiries}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#1B5E20']} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>📩</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#333' }}>No inquiries yet</Text>
              <Text style={{ fontSize: 14, color: '#888', marginTop: 6 }}>Tenants will contact you here when interested in your properties</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1B5E20', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#F9A825', fontWeight: '700' },
  list: { padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tenantAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E0E0E0' },
  tenantInfo: { flex: 1, marginLeft: 10 },
  tenantName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingText: { fontSize: 12, color: '#888' },
  time: { fontSize: 11, color: '#aaa' },
  propRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, backgroundColor: '#F8F8F8', borderRadius: 8, padding: 8 },
  propThumb: { width: 56, height: 44, borderRadius: 6 },
  propInfo: { flex: 1 },
  propTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  propLoc: { fontSize: 11, color: '#888', marginTop: 2 },
  msgBox: { backgroundColor: '#F0F4F0', borderRadius: 8, padding: 10, marginBottom: 12 },
  msgText: { fontSize: 13, color: '#555', fontStyle: 'italic', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1B5E20', borderRadius: 10, paddingVertical: 11 },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: '#E53935', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  rejectBtnText: { color: '#E53935', fontWeight: '700', fontSize: 13 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1565C0', borderRadius: 10, paddingVertical: 11 },
  chatBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectedNote: { backgroundColor: '#FFEBEE', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectedText: { fontSize: 13, color: '#C62828', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
});
