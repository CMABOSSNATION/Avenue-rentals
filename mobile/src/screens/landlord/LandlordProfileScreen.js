// mobile/src/screens/landlord/LandlordProfileScreen.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../../store';
import api from '../../services/api';

export default function LandlordProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuthStore();

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  async function saveMoMo() {
    // In full implementation, show a modal for MoMo details
    Alert.alert('Add MoMo', 'Enter your MoMo number in settings to receive payments from tenants');
  }

  async function submitNationalId() {
    Alert.alert('Verify National ID', 'You will need to upload:\n1. Front of your National ID\n2. Selfie holding your ID\n\nThis gives you a Verified badge that increases tenant trust.');
  }

  const menuItems = [
    { icon: 'account-edit', label: 'Edit Profile', onPress: () => Alert.alert('Coming soon') },
    { icon: 'cellphone', label: user?.momo_number ? `MoMo: ${user.momo_number}` : 'Add MoMo Number', onPress: saveMoMo },
    { icon: 'shield-account', label: 'Get ID Verified', badge: !user?.national_id_verified, onPress: submitNationalId },
    { icon: 'star-outline', label: 'My Reviews', onPress: () => navigation.navigate('UserProfile', { userId: user?.id }) },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => Alert.alert('Support', 'WhatsApp: +256700000000\nEmail: support@nyumba.ug') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.headerBg}>
          <FastImage
            style={styles.avatar}
            source={{ uri: user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'L')}&background=F9A825&color=1B5E20&size=120` }}
          />
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userPhone}>{user?.phone}</Text>

          <View style={styles.badges}>
            <View style={styles.roleBadge}>
              <Icon name="home-city" size={13} color="#fff" />
              <Text style={styles.roleText}>Landlord</Text>
            </View>
            {user?.national_id_verified && (
              <View style={[styles.roleBadge, { backgroundColor: '#F9A825' }]}>
                <Icon name="shield-check" size={13} color="#fff" />
                <Text style={styles.roleText}>Verified</Text>
              </View>
            )}
          </View>

          {!user?.national_id_verified && (
            <TouchableOpacity style={styles.verifyPrompt} onPress={submitNationalId}>
              <Icon name="shield-alert" size={14} color="#F9A825" />
              <Text style={styles.verifyPromptText}>Get Verified → more tenant trust</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="star" size={20} color="#F9A825" />
            <Text style={styles.statNum}>{user?.rating?.toFixed(1) || '—'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Icon name="account-multiple" size={20} color="#1B5E20" />
            <Text style={styles.statNum}>{user?.total_reviews || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Icon name="home-city" size={20} color="#1B5E20" />
            <Text style={styles.statNum}>—</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </View>
        </View>

        {/* National ID status */}
        <View style={styles.idStatusCard}>
          <Icon
            name={user?.national_id_verified ? 'shield-check' : user?.national_id_url ? 'clock-outline' : 'shield-alert-outline'}
            size={24}
            color={user?.national_id_verified ? '#1B5E20' : user?.national_id_url ? '#E65100' : '#888'}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.idStatusTitle}>
              {user?.national_id_verified ? '✅ ID Verified' :
               user?.national_id_url ? '⏳ Verification Pending' : '⚠️ Not Verified'}
            </Text>
            <Text style={styles.idStatusSub}>
              {user?.national_id_verified ? 'You have a verified badge on all your listings' :
               user?.national_id_url ? 'Admin is reviewing your documents (up to 24h)' :
               'Submit your National ID to get the verified badge'}
            </Text>
          </View>
          {!user?.national_id_url && (
            <TouchableOpacity onPress={submitNationalId}>
              <Text style={{ color: '#1B5E20', fontWeight: '700', fontSize: 13 }}>Submit →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {menuItems.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.menuItem} onPress={item.onPress}>
              <Icon name={item.icon} size={22} color="#555" />
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.badge && <View style={styles.dotBadge} />}
              <Icon name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="logout" size={18} color="#E53935" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>🇺🇬 Nyumba — Find a house. No broker.</Text>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  headerBg: { backgroundColor: '#1B5E20', alignItems: 'center', paddingTop: 30, paddingBottom: 24 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#F9A825', marginBottom: 12 },
  userName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  userPhone: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 2, marginBottom: 10 },
  badges: { flexDirection: 'row', gap: 8 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  roleText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  verifyPrompt: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  verifyPromptText: { fontSize: 13, color: '#F9A825', fontWeight: '600' },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, margin: 14, borderRadius: 12, elevation: 2, justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 3 },
  statNum: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  statLabel: { fontSize: 11, color: '#888' },
  statDivider: { width: 1, backgroundColor: '#E0E0E0' },
  idStatusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', marginHorizontal: 14, marginBottom: 12, borderRadius: 12, padding: 14, elevation: 1 },
  idStatusTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  idStatusSub: { fontSize: 12, color: '#888', lineHeight: 17 },
  section: { backgroundColor: '#fff', marginHorizontal: 14, marginBottom: 12, borderRadius: 12, padding: 16, elevation: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuLabel: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  dotBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53935' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 14, marginBottom: 16, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, borderWidth: 1.5, borderColor: '#FFEBEE', elevation: 1 },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#E53935' },
  footer: { textAlign: 'center', fontSize: 12, color: '#bbb', marginBottom: 4 },
});
