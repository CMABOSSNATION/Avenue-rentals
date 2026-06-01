// mobile/src/screens/shared/UserProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  ActivityIndicator,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import api from '../../services/api';

function StarRating({ rating, size = 16 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Icon key={s} name={s <= Math.round(rating) ? 'star' : 'star-outline'} size={size} color="#F9A825" />
      ))}
    </View>
  );
}

export default function UserProfileScreen({ route }) {
  const { userId } = route.params;
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/users/${userId}`),
      api.get(`/reviews/user/${userId}`),
    ]).then(([u, r]) => {
      setUser(u.data);
      setReviews(r.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#1B5E20" />;
  if (!user) return (
    <View style={styles.error}>
      <Text>Could not load profile</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Profile Header */}
        <View style={styles.header}>
          <FastImage
            style={styles.avatar}
            source={{ uri: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1B5E20&color=fff&size=120` }}
          />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.role}>{user.role === 'landlord' ? '🏡 Landlord' : '🔍 Tenant'}</Text>

          {user.district && (
            <Text style={styles.location}>📍 {user.district}, Uganda</Text>
          )}

          <View style={styles.badges}>
            {user.national_id_verified && (
              <View style={styles.verifiedBadge}>
                <Icon name="shield-check" size={14} color="#fff" />
                <Text style={styles.verifiedText}>ID Verified</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <StarRating rating={user.rating || 0} size={18} />
              <Text style={styles.statNum}>{user.rating?.toFixed(1) || '—'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Icon name="account-multiple" size={22} color="#1B5E20" />
              <Text style={styles.statNum}>{user.total_reviews || 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Icon name="calendar" size={22} color="#1B5E20" />
              <Text style={styles.statNum}>{new Date(user.created_at).getFullYear()}</Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <Text style={styles.reviewsTitle}>Reviews ({reviews.length})</Text>

          {reviews.length === 0 ? (
            <View style={styles.noReviews}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>⭐</Text>
              <Text style={{ color: '#888', fontSize: 14 }}>No reviews yet</Text>
            </View>
          ) : (
            reviews.map(review => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <FastImage
                    style={styles.reviewerAvatar}
                    source={{ uri: review.reviewer?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.reviewer?.name || 'R')}&background=E8F5E9&color=1B5E20` }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewerName}>{review.reviewer?.name}</Text>
                    <StarRating rating={review.rating} size={13} />
                  </View>
                  <Text style={styles.reviewDate}>
                    {format(new Date(review.created_at), 'MMM yyyy')}
                  </Text>
                </View>
                {review.comment && (
                  <Text style={styles.reviewComment}>"{review.comment}"</Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  error: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1B5E20', alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#F9A825', marginBottom: 12 },
  name: { fontSize: 22, fontWeight: '800', color: '#fff' },
  role: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  location: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F9A825', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  verifiedText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, marginTop: 16, gap: 0, justifyContent: 'space-around', width: '100%' },
  stat: { alignItems: 'center', gap: 4 },
  statNum: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  reviewsSection: { padding: 16 },
  reviewsTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginBottom: 12 },
  noReviews: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff', borderRadius: 12 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewerAvatar: { width: 38, height: 38, borderRadius: 19 },
  reviewerName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  reviewDate: { fontSize: 11, color: '#aaa' },
  reviewComment: { fontSize: 13, color: '#555', fontStyle: 'italic', lineHeight: 18 },
});
