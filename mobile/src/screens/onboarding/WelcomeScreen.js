// mobile/src/screens/onboarding/WelcomeScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.emoji}>🏠</Text>
        <Text style={styles.title}>Nyumba</Text>
        <Text style={styles.subtitle}>Find a house. No broker.{'\n'}All across Uganda.</Text>
      </View>

      <View style={styles.options}>
        <Text style={styles.question}>I want to...</Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Phone', { role: 'tenant' })}
        >
          <Text style={styles.cardEmoji}>🔍</Text>
          <Text style={styles.cardTitle}>Find a house to rent</Text>
          <Text style={styles.cardSub}>Browse verified listings, chat with landlords directly</Text>
          <Text style={styles.cardCTA}>Continue as Tenant →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.cardLandlord]}
          onPress={() => navigation.navigate('Phone', { role: 'landlord' })}
        >
          <Text style={styles.cardEmoji}>🏡</Text>
          <Text style={styles.cardTitle}>List my property</Text>
          <Text style={styles.cardSub}>Reach thousands of tenants, no broker commission</Text>
          <Text style={[styles.cardCTA, { color: '#1B5E20' }]}>Continue as Landlord →</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        🇺🇬 Serving all Uganda districts
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  top: { backgroundColor: '#1B5E20', paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center' },
  emoji: { fontSize: 48 },
  title: { fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 8, textAlign: 'center', lineHeight: 22 },
  options: { flex: 1, padding: 20 },
  question: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16, marginTop: 8 },
  card: {
    backgroundColor: '#1B5E20', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  cardLandlord: { backgroundColor: '#F9A825' },
  cardEmoji: { fontSize: 32, marginBottom: 8 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  cardSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18, marginBottom: 12 },
  cardCTA: { fontSize: 14, fontWeight: '700', color: '#fff' },
  footer: { textAlign: 'center', color: '#999', fontSize: 13, paddingBottom: 24 },
});
