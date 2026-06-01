// mobile/src/screens/tenant/TenantProfileScreen.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, Switch,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuthStore } from '../../store';
import api from '../../services/api';

export default function TenantProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuthStore();
  const [whatsappOptin, setWhatsappOptin] = useState(user?.whatsapp_optin !== false);

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  async function changeAvatar() {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]) {
      try {
        // Upload and update — in real app, upload to Supabase first
        Alert.alert('Feature', 'Upload avatar to Supabase storage and call PUT /users/me');
      } catch {}
    }
  }

  async function toggleWhatsApp(value) {
    setWhatsappOptin(value);
    await api.put('/users/me', { whatsapp_optin: value });
    updateUser({ whatsapp_optin: value });
  }

  const menuItems = [
    { icon: 'account-edit', label: 'Edit Profile', onPress: () => Alert.alert('Coming soon', 'Edit your name and photo') },
    { icon: 'shield-check', label: 'Verify National ID', onPress: () => Alert.alert('Coming soon', 'Upload your national ID for a verified badge') },
    { icon: 'star-outline', label: 'My Reviews', onPress: () => navigation.navigate('UserProfile', { userId: user?.id }) },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => Alert.alert('Support', 'WhatsApp: +256700000000\nEmail: support@nyumba.ug') },
    { icon: 'information-outline', label: 'About Nyumba', onPress: () => Alert.alert('Nyumba v1.0', 'Find a house. No broker.\n\nServing all Uganda districts.\n\n© 2024 Nyumba Uganda') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.headerBg}>
          <TouchableOpacity onPress={changeAvatar} style={styles.avatarWrap}>
            <FastImage
              style={styles.avatar}
              source={{ uri: user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=F9A825&color=1B5E20&size=120` }}
            />
            <View style={styles.cameraBtn}>
              <Icon name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userPhone}>{user?.phone}</Text>
          <View style={styles.roleBadge}>
            <Icon name="magnify" size={14} color="#fff" />
            <Text style={styles.roleText}>Tenant</Text>
          </View>
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
            <Icon name="chat-outline" size={20} color="#1B5E20" />
            <Text style={styles.statNum}>{user?.total_reviews || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Icon name={user?.is_verified ? 'shield-check' : 'shield-outline'} size={20} color={user?.is_verified ? '#1B5E20' : '#ccc'} />
            <Text style={styles.statNum}>{user?.is_verified ? 'Yes' : 'No'}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
        </View>

        {/* WhatsApp notifications toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>WhatsApp Notifications</Text>
              <Text style={styles.settingDesc}>Receive updates on inquiries and deals</Text>
            </View>
            <Switch
              value={whatsappOptin}
              onValueChange={toggleWhatsApp}
              trackColor={{ true: '#1B5E20' }}
            />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {menuItems.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.menuItem} onPress={item.onPress}>
              <Icon name={item.icon} size={22} color="#555" />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Icon name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
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
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#F9A825' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#F9A825', borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  userPhone: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 8 },
  roleText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, margin: 14, borderRadius: 12, elevation: 2, justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 3 },
  statNum: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  statLabel: { fontSize: 11, color: '#888' },
  statDivider: { width: 1, backgroundColor: '#E0E0E0' },
  section: { backgroundColor: '#fff', marginHorizontal: 14, marginBottom: 12, borderRadius: 12, padding: 16, elevation: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  settingDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuLabel: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 14, marginBottom: 16, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, borderWidth: 1.5, borderColor: '#FFEBEE', elevation: 1 },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#E53935' },
  footer: { textAlign: 'center', fontSize: 12, color: '#bbb', marginBottom: 4 },
});
