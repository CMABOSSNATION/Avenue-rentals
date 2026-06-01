// mobile/src/screens/onboarding/ProfileSetupScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Image, Alert, ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import api from '../../services/api';
import { useAuthStore } from '../../store';

export default function ProfileSetupScreen({ navigation, route }) {
  const { user } = route.params;
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuthStore();

  async function pickAvatar() {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]) setAvatar(result.assets[0]);
  }

  async function handleContinue() {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Name Required', 'Please enter your full name');
      return;
    }
    setLoading(true);
    try {
      let avatar_url = null;
      if (avatar) {
        // Upload avatar to Supabase Storage via your backend
        const formData = new FormData();
        formData.append('file', { uri: avatar.uri, type: avatar.type, name: 'avatar.jpg' });
        const { data: uploadData } = await api.post('/users/me/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        avatar_url = uploadData.url;
      }

      const { data } = await api.put('/users/me', { name: name.trim(), avatar_url });
      updateUser(data);
      // Navigation handled by App.js auth state
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Set Up Your Profile</Text>
        <Text style={styles.subtitle}>This helps landlords and tenants know who they're dealing with</Text>

        <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap}>
          {avatar ? (
            <Image source={{ uri: avatar.uri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>👤</Text>
              <Text style={styles.avatarLabel}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Your Full Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Nakato Sarah"
          placeholderTextColor="#aaa"
          autoCapitalize="words"
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ✅ Your phone is already verified{'\n'}
            {user?.role === 'landlord'
              ? '🏡 You can add listings and receive inquiries'
              : '🔍 You can search and contact landlords directly'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, (!name.trim() || loading) && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!name.trim() || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue to Nyumba →</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 24, paddingTop: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#1B5E20' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 8, marginBottom: 28, lineHeight: 20 },
  avatarWrap: { alignSelf: 'center', marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#1B5E20' },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#A5D6A7', borderStyle: 'dashed',
  },
  avatarEmoji: { fontSize: 32 },
  avatarLabel: { fontSize: 11, color: '#1B5E20', fontWeight: '600', marginTop: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 16, color: '#1A1A1A', marginBottom: 20,
  },
  infoBox: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 16, marginBottom: 24 },
  infoText: { fontSize: 14, color: '#1B5E20', lineHeight: 22 },
  btn: { backgroundColor: '#1B5E20', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
