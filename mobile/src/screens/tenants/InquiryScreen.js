// mobile/src/screens/tenant/InquiryScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import api from '../../services/api';
import { formatUGX } from '../../data/ugandaLocations';

export default function InquiryScreen({ navigation, route }) {
  const { property } = route.params;
  const [message, setMessage] = useState('Hello, I am interested in your property. Is it still available?');
  const [loading, setLoading] = useState(false);

  const cover = property.property_images?.sort((a,b) => a.order_index - b.order_index)[0]?.url;

  async function sendInquiry() {
    setLoading(true);
    try {
      const { data } = await api.post('/inquiries', {
        property_id: property.id,
        message,
      });
      Alert.alert(
        '✅ Inquiry Sent!',
        'The landlord has been notified via WhatsApp. They will accept or reject your inquiry.',
        [{ text: 'View Chat', onPress: () => navigation.replace('Chat', { inquiryId: data.inquiry.id, inquiry: data.inquiry }) }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send inquiry');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Property thumbnail */}
        <View style={styles.propertyCard}>
          <FastImage
            style={styles.propertyImg}
            source={{ uri: cover || 'https://via.placeholder.com/80' }}
            resizeMode="cover"
          />
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyTitle} numberOfLines={2}>{property.title}</Text>
            <Text style={styles.propertyPrice}>{formatUGX(property.price)}/{property.price_period}</Text>
            <Text style={styles.propertyLoc}>
              📍 {[property.town, property.parish, property.district].filter(Boolean).join(', ')}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Your inquiry will be sent to the landlord. They will accept or reject it. You can chat once accepted.
          </Text>
        </View>

        <Text style={styles.label}>Your Message</Text>
        <TextInput
          style={styles.textarea}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={500}
          placeholder="Write your message to the landlord..."
          placeholderTextColor="#aaa"
        />
        <Text style={styles.charCount}>{message.length}/500</Text>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={sendInquiry}
          disabled={loading || !message.trim()}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>📨 Send Inquiry to Landlord</Text>}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          No broker fees. You talk directly with the landlord.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  propertyCard: { flexDirection: 'row', backgroundColor: '#F8F8F8', borderRadius: 12, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  propertyImg: { width: 90, height: 90 },
  propertyInfo: { flex: 1, padding: 12 },
  propertyTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  propertyPrice: { fontSize: 15, fontWeight: '800', color: '#1B5E20', marginBottom: 3 },
  propertyLoc: { fontSize: 12, color: '#888' },
  infoBox: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 20 },
  infoText: { fontSize: 13, color: '#1B5E20', lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8 },
  textarea: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A1A', minHeight: 120, backgroundColor: '#FAFAFA' },
  charCount: { fontSize: 12, color: '#aaa', alignSelf: 'flex-end', marginTop: 4, marginBottom: 20 },
  btn: { backgroundColor: '#1B5E20', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  btnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: { textAlign: 'center', fontSize: 12, color: '#999', fontStyle: 'italic' },
});
