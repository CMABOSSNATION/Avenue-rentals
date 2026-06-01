// mobile/src/screens/onboarding/OTPScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import api from '../../services/api';
import { useAuthStore } from '../../store';

export default function OTPScreen({ navigation, route }) {
  const { phone, role, network } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef(null);
  const { setAuth } = useAuthStore();

  useEffect(() => {
    inputRef.current?.focus();
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { setCanResend(true); clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (code.length === 6) handleVerify();
  }, [code]);

  async function handleVerify() {
    if (loading || code.length !== 6) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, code, role });
      setAuth({ user: data.user, token: data.token, refreshToken: data.refreshToken });

      if (data.isNewUser) {
        navigation.replace('ProfileSetup', { user: data.user });
      }
      // If not new user, App.js will handle navigation via auth state
    } catch (err) {
      Alert.alert('Wrong Code', err.response?.data?.error || 'Invalid code. Try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!canResend) return;
    try {
      await api.post('/auth/send-otp', { phone });
      setCountdown(60);
      setCanResend(false);
      Alert.alert('Sent!', 'A new code has been sent.');
    } catch (err) {
      Alert.alert('Error', 'Failed to resend. Try again.');
    }
  }

  const maskedPhone = phone.replace(/(\+256)(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.phone}>{maskedPhone}</Text>
          {network ? `\n(${network})` : ''}
        </Text>

        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={code}
          onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
        />

        {/* Visual OTP boxes */}
        <TouchableOpacity onPress={() => inputRef.current?.focus()}>
          <View style={styles.boxes}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <View key={i} style={[styles.box, code.length === i && styles.boxActive, code[i] && styles.boxFilled]}>
                <Text style={styles.boxText}>{code[i] || ''}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {loading && <ActivityIndicator color="#1B5E20" size="large" style={{ marginTop: 20 }} />}

        <TouchableOpacity
          style={[styles.btn, code.length < 6 && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={loading || code.length < 6}
        >
          <Text style={styles.btnText}>Verify Code</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={!canResend}>
          <Text style={[styles.resend, !canResend && styles.resendDisabled]}>
            {canResend ? 'Resend Code' : `Resend in ${countdown}s`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 24, alignItems: 'center', paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '800', color: '#1B5E20', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  phone: { fontWeight: '700', color: '#333' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  boxes: { flexDirection: 'row', gap: 10, marginTop: 32, marginBottom: 32 },
  box: {
    width: 48, height: 56, borderRadius: 10, borderWidth: 2, borderColor: '#E0E0E0',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8F8',
  },
  boxActive: { borderColor: '#1B5E20', backgroundColor: '#E8F5E9' },
  boxFilled: { borderColor: '#1B5E20', backgroundColor: '#E8F5E9' },
  boxText: { fontSize: 22, fontWeight: '800', color: '#1B5E20' },
  btn: { backgroundColor: '#1B5E20', borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', marginBottom: 16 },
  btnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resend: { fontSize: 15, color: '#1B5E20', fontWeight: '600' },
  resendDisabled: { color: '#aaa' },
});
