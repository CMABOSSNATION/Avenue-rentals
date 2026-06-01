// mobile/src/screens/landlord/MyListingsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { formatUGX } from '../../data/ugandaLocations';

const STATUS_CFG = {
  pending:   { label: 'Under Review', color: '#E65100', bg: '#FFF3E0', icon: 'clock-outline' },
  active:    { label: 'Live ✅', color: '#1B5E20', bg: '#E8F5E9', icon: 'check-circle' },
  taken:     { label: 'Rented Out', color: '#1565C0', bg: '#E3F2FD', icon: 'home-account' },
  suspended: { label: 'Suspended', color: '#6A1B9A', bg: '#F3E5F5', icon: 'pause-circle' },
  rejected:  { label: 'Rejected', color: '#C62828', bg: '#FFEBEE', icon: 'close-circle' },
};

export default function MyListingsScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data } = await api.get('/properties/my/listings');
      setListings(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function deleteListing(id) {
    Alert.alert('Delete Listing', 'Are you sure you want to delete this property?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/properties/${id}`);
            setListings(prev => prev.filter(l => l.id !== id));
          } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to delete');
          }
        },
      },
    ]);
  }

  function renderListing({ item }) {
    const statusCfg = STATUS_CFG[item.status] || STATUS_CFG.pending;
    const cover = item.property_images?.sort((a,b) => a.order_index - b.order_index)[0]?.url;

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}>
          <FastImage
            style={styles.cardImg}
            source={{ uri: cover || 'https://via.placeholder.com/400x150?text=No+Photo' }}
            resizeMode="cover"
          />
          {item.is_featured && (
            <View style={styles.featuredBadge}><Text style={styles.featuredText}>⭐ Featured</Text></View>
          )}
        </TouchableOpacity>

        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Icon name={statusCfg.icon} size={12} color={statusCfg.color} />
              <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>

          <Text style={styles.price}>{formatUGX(item.price)}/{item.price_period}</Text>
          <Text style={styles.location}>📍 {[item.town, item.district].filter(Boolean).join(', ')}, Uganda</Text>

          {/* Rejection reason */}
          {item.status === 'rejected' && item.rejection_reason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionLabel}>❌ Rejection Reason:</Text>
              <Text style={styles.rejectionText}>{item.rejection_reason}</Text>
              <Text style={styles.rejectionHint}>Edit the listing to fix the issue and resubmit</Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Icon name="eye-outline" size={15} color="#888" />
              <Text style={styles.statText}>{item.views || 0} views</Text>
            </View>
            <View style={styles.stat}>
              <Icon name="email-outline" size={15} color="#888" />
              <Text style={styles.statText}>{item.inquiries_count || 0} inquiries</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('AddProperty', { editMode: true, property: item })}
            >
              <Icon name="pencil" size={15} color="#1B5E20" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteListing(item.id)}>
              <Icon name="trash-can-outline" size={15} color="#E53935" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏡 My Listings</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddProperty')}>
          <Icon name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color="#1B5E20" />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id}
          renderItem={renderListing}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#1B5E20']} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>🏚️</Text>
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySub}>Tap "Add" to list your first property on Nyumba</Text>
              <TouchableOpacity style={styles.addFirstBtn} onPress={() => navigation.navigate('AddProperty')}>
                <Text style={styles.addFirstBtnText}>+ Add Your First Listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1B5E20', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F9A825', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  list: { padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 14, overflow: 'hidden', elevation: 3 },
  cardImg: { width: '100%', height: 160 },
  featuredBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#F9A825', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  featuredText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  cardBody: { padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginRight: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  price: { fontSize: 18, fontWeight: '800', color: '#1B5E20', marginBottom: 3 },
  location: { fontSize: 13, color: '#888', marginBottom: 10 },
  rejectionBox: { backgroundColor: '#FFEBEE', borderRadius: 8, padding: 10, marginBottom: 10 },
  rejectionLabel: { fontSize: 12, fontWeight: '700', color: '#C62828', marginBottom: 3 },
  rejectionText: { fontSize: 13, color: '#C62828', lineHeight: 18 },
  rejectionHint: { fontSize: 11, color: '#888', marginTop: 4, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 13, color: '#888' },
  actions: { flexDirection: 'row', gap: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: '#1B5E20', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  editBtnText: { color: '#1B5E20', fontWeight: '700', fontSize: 13 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: '#E53935', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  deleteBtnText: { color: '#E53935', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  emptySub: { fontSize: 14, color: '#888', marginTop: 6, textAlign: 'center', lineHeight: 20 },
  addFirstBtn: { marginTop: 20, backgroundColor: '#1B5E20', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  addFirstBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
