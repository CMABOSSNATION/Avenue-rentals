// mobile/src/screens/onboarding/PhoneScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView,
} from 'react-native';
import { validateUgandaPhone } from '../../data/ugandaLocations';
import api from '../../services/api';

export default function PhoneScreen({ navigation, route }) {
  const { role } = route.params;
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [networkHint, setNetworkHint] = useState('');

  function handlePhoneChange(text) {
    // Only allow digits
    const digits = text.replace(/\D/g, '');
    setPhone(digits);

    if (digits.length >= 3) {
      const prefix = digits.startsWith('256') ? '0' + digits.slice(3, 6) : digits.slice(0, 3);
      const mtn = ['077', '078', '076', '039'];
      const airtel = ['070', '075', '074'];
      if (mtn.some(p => prefix.startsWith(p.slice(1)))) setNetworkHint('MTN');
      else if (airtel.some(p => prefix.startsWith(p.slice(1)))) setNetworkHint('Airtel');
      else setNetworkHint('');
    } else {
      setNetworkHint('');
    }
  }

  async function handleSendOTP() {
    const fullPhone = '0' + phone.replace(/^0/, '');
    const { valid, normalized, network } = validateUgandaPhone(fullPhone);

    if (!valid) {
      Alert.alert('Invalid Number', 'Please enter a valid Uganda number (MTN: 077/078/076/039, Airtel: 070/075/074)');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: normalized });
      navigation.navigate('OTP', { phone: normalized, role, network });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.inner} behavior="padding">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {role === 'tenant' ? '🔍 Find a House' : '🏡 List Your Property'}
          </Text>
          <Text style={styles.headerSub}>Enter your Uganda phone number to continue</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.prefix}>
              <Text style={styles.flag}>🇺🇬</Text>
              <Text style={styles.prefixText}>+256</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="7X XXX XXXX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              maxLength={10}
              placeholderTextColor="#aaa"
            />
          </View>

          {networkHint ? (
            <Text style={styles.networkHint}>
              {networkHint === 'MTN' ? '🟡' : '🔴'} {networkHint} number detected
            </Text>
          ) : null}

          <Text style={styles.hint}>
            Accepted: MTN (077/078/076/039) · Airtel (070/075/074)
          </Text>

          <TouchableOpacity
            style={[styles.btn, (!phone || phone.length < 9) && styles.btnDisabled]}
            onPress={handleSendOTP}
            disabled={loading || phone.length < 9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Send Verification Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 24 },
  header: { marginTop: 20, marginBottom: 36 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1B5E20' },
  headerSub: { fontSize: 15, color: '#666', marginTop: 8 },
  form: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  phoneRow: { flexDirection: 'row', borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 12, overflow: 'hidden' },
  prefix: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 12, paddingVertical: 14 },
  flag: { fontSize: 20, marginRight: 4 },
  prefixText: { fontSize: 16, fontWeight: '700', color: '#333' },
  input: { flex: 1, fontSize: 18, paddingHorizontal: 12, color: '#1A1A1A', fontWeight: '600' },
  networkHint: { fontSize: 13, color: '#1B5E20', marginTop: 8, fontWeight: '600' },
  hint: { fontSize: 12, color: '#999', marginTop: 8, marginBottom: 24 },
  btn: { backgroundColor: '#1B5E20', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
