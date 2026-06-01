// mobile/src/screens/landlord/CreateDealScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import api from '../../services/api';
import { formatUGX } from '../../data/ugandaLocations';

export default function CreateDealScreen({ navigation, route }) {
  const { inquiry } = route.params;
  const [price, setPrice] = useState(inquiry?.properties?.price?.toString() || '');
  const [moveInDate, setMoveInDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dealCreated, setDealCreated] = useState(null);

  const platformFee = parseInt(price) < 500000 ? 10000 : 20000;

  async function createDeal() {
    if (!price || isNaN(parseInt(price))) {
      Alert.alert('Invalid Price', 'Please enter the agreed monthly rent');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/deals', {
        inquiry_id: inquiry.id,
        agreed_price: parseInt(price),
        move_in_date: format(moveInDate, 'yyyy-MM-dd'),
      });
      setDealCreated(data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create deal');
    } finally {
      setLoading(false);
    }
  }

  // Deal created — show payment instructions
  if (dealCreated) {
    const pi = dealCreated.payment_instructions;
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.successIcon}><Text style={{ fontSize: 56 }}>🎉</Text></View>
          <Text style={styles.successTitle}>Deal Created!</Text>
          <Text style={styles.successSub}>Share these payment instructions with {inquiry.tenant?.name}</Text>

          <View style={styles.paymentCard}>
            <Text style={styles.paymentLabel}>Platform Fee to Pay</Text>
            <Text style={styles.paymentAmount}>{formatUGX(pi.amount)}</Text>
            <View style={styles.divider} />
            <Text style={styles.paymentLabel}>Send MoMo to</Text>
            <Text style={styles.paymentValue}>{pi.platform_momo}</Text>
            <Text style={styles.paymentName}>{pi.platform_name}</Text>
            <View style={styles.divider} />
            <Text style={styles.paymentLabel}>Reference</Text>
            <View style={styles.refBox}>
              <Text style={styles.refText}>{pi.reference}</Text>
            </View>
            <Text style={styles.refNote}>Tenant must include this reference when sending payment</Text>
          </View>

          <View style={styles.whatsappBox}>
            <Text style={styles.whatsappText}>
              💬 Copy this message to send to the tenant on WhatsApp:
            </Text>
            <Text style={styles.whatsappMsg}>
              {`Hi ${inquiry.tenant?.name}, your rental of "${inquiry.properties?.title}" has been confirmed! 🏠\n\nPlease pay the Nyumba platform fee of ${formatUGX(pi.amount)} to:\n📱 ${pi.platform_momo}\n👤 ${pi.platform_name}\n\nReference: ${pi.reference}\n\nMove-in date: ${format(moveInDate, 'dd MMM yyyy')}\n\nWelcome home! 🎉`}
            </Text>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Property Summary */}
        <View style={styles.propCard}>
          <Text style={styles.propTitle} numberOfLines={1}>{inquiry.properties?.title}</Text>
          <Text style={styles.propLoc}>📍 {inquiry.properties?.district}, Uganda</Text>
          <Text style={styles.tenantLine}>👤 Tenant: <Text style={{ fontWeight: '800' }}>{inquiry.tenant?.name}</Text></Text>
        </View>

        {/* Agreed Price */}
        <Text style={styles.label}>Agreed Monthly Rent (UGX) *</Text>
        <View style={styles.priceRow}>
          <Text style={styles.ugxLabel}>UGX</Text>
          <TextInput
            style={styles.priceInput}
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
            placeholder="e.g. 350000"
            placeholderTextColor="#aaa"
          />
        </View>

        {/* Platform Fee Preview */}
        {price && !isNaN(parseInt(price)) && (
          <View style={styles.feeBox}>
            <Text style={styles.feeLabel}>Platform fee: <Text style={styles.feeAmount}>{formatUGX(platformFee)}</Text></Text>
            <Text style={styles.feeNote}>One-time fee paid by tenant to Nyumba</Text>
          </View>
        )}

        {/* Move-in Date */}
        <Text style={styles.label}>Move-in Date</Text>
        <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>{format(moveInDate, 'dd MMMM yyyy')}</Text>
          <Text style={styles.dateIcon}>📅</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={moveInDate}
            mode="date"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setMoveInDate(date);
            }}
          />
        )}

        <TouchableOpacity
          style={[styles.createBtn, loading && styles.createBtnDisabled]}
          onPress={createDeal}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>🤝 Create Deal</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  propCard: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, marginBottom: 20 },
  propTitle: { fontSize: 16, fontWeight: '800', color: '#1B5E20', marginBottom: 3 },
  propLoc: { fontSize: 13, color: '#555', marginBottom: 3 },
  tenantLine: { fontSize: 13, color: '#555' },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8, marginTop: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, overflow: 'hidden' },
  ugxLabel: { backgroundColor: '#F5F5F5', paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, fontWeight: '700', color: '#1B5E20' },
  priceInput: { flex: 1, paddingHorizontal: 14, fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  feeBox: { backgroundColor: '#FFF8E1', borderRadius: 8, padding: 10, marginTop: 8 },
  feeLabel: { fontSize: 13, color: '#555' },
  feeAmount: { fontWeight: '800', color: '#1B5E20' },
  feeNote: { fontSize: 11, color: '#888', marginTop: 2 },
  datePicker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 24 },
  dateText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  dateIcon: { fontSize: 18 },
  createBtn: { backgroundColor: '#1B5E20', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  // Success state
  successIcon: { alignItems: 'center', marginBottom: 12, marginTop: 20 },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#1B5E20', textAlign: 'center', marginBottom: 6 },
  successSub: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  paymentCard: { backgroundColor: '#F8F8F8', borderRadius: 14, padding: 18, marginBottom: 16 },
  paymentLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  paymentAmount: { fontSize: 28, fontWeight: '800', color: '#1B5E20', marginBottom: 14 },
  paymentValue: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  paymentName: { fontSize: 13, color: '#666', marginBottom: 14 },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 14 },
  refBox: { backgroundColor: '#E8F5E9', borderRadius: 8, padding: 12, marginBottom: 4 },
  refText: { fontSize: 16, fontWeight: '800', color: '#1B5E20', letterSpacing: 1 },
  refNote: { fontSize: 12, color: '#888', fontStyle: 'italic' },
  whatsappBox: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, marginBottom: 20 },
  whatsappText: { fontSize: 13, fontWeight: '700', color: '#1B5E20', marginBottom: 8 },
  whatsappMsg: { fontSize: 13, color: '#333', lineHeight: 20 },
  doneBtn: { backgroundColor: '#1B5E20', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
