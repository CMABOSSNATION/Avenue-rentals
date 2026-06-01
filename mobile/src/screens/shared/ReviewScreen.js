// mobile/src/screens/shared/ReviewScreen.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../services/api';

export default function ReviewScreen({ navigation, route }) {
  const { dealId } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const LABELS = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent!'];

  async function submit() {
    if (rating === 0) { Alert.alert('Rating Required', 'Please select a star rating'); return; }
    setLoading(true);
    try {
      await api.post('/reviews', { deal_id: dealId, rating, comment });
      Alert.alert('Thank you! 🌟', 'Your review has been submitted.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>How was your experience?</Text>
        <Text style={styles.subtitle}>Your honest review helps the Nyumba community</Text>

        {/* Star Rating */}
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
              <Icon
                name={star <= rating ? 'star' : 'star-outline'}
                size={52}
                color={star <= rating ? '#F9A825' : '#E0E0E0'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {rating > 0 && (
          <Text style={styles.ratingLabel}>{LABELS[rating]}</Text>
        )}

        <Text style={styles.label}>Comment (optional)</Text>
        <TextInput
          style={styles.textarea}
          value={comment}
          onChangeText={setComment}
          placeholder="Share your experience with the landlord or property..."
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={500}
        />

        <TouchableOpacity
          style={[styles.btn, (rating === 0 || loading) && styles.btnDisabled]}
          onPress={submit}
          disabled={rating === 0 || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Review</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 24, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 32, textAlign: 'center' },
  stars: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  ratingLabel: { fontSize: 16, fontWeight: '700', color: '#F9A825', marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', alignSelf: 'flex-start', marginBottom: 8 },
  textarea: {
    width: '100%', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    padding: 14, fontSize: 15, minHeight: 120, marginBottom: 24, backgroundColor: '#FAFAFA', color: '#1A1A1A',
  },
  btn: { width: '100%', backgroundColor: '#1B5E20', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#ccc' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
