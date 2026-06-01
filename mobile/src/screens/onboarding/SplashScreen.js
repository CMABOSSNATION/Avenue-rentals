// mobile/src/screens/onboarding/SplashScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace('Welcome'), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🏠</Text>
      <Text style={styles.name}>Nyumba</Text>
      <Text style={styles.tagline}>Find a house. No broker.</Text>
      <Text style={styles.sub}>Connecting landlords & tenants{'\n'}across all Uganda</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B5E20', justifyContent: 'center', alignItems: 'center' },
  logo: { fontSize: 72, marginBottom: 12 },
  name: { fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 18, color: '#F9A825', marginTop: 8, fontWeight: '600' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 16, textAlign: 'center', lineHeight: 22 },
});
