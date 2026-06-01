// mobile/src/screens/shared/PropertyDetailScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, Alert, ActivityIndicator, Share,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import MapView, { Marker, Circle } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../services/api';
import { useAuthStore, usePropertyStore } from '../../store';
import { formatUGX, AMENITIES_LIST, REPORT_REASONS } from '../../data/ugandaLocations';
import Modal from 'react-native'; // use built-in

const { width } = Dimensions.get('window');
const COLORS = { primary: '#1B5E20', gold: '#F9A825' };

export default function PropertyDetailScreen({ navigation, route }) {
  const { propertyId } = route.params;
  const { user } = useAuthStore();
  const { savedIds, toggleSave } = usePropertyStore();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  useEffect(() => {
    setIsSaved(savedIds.includes(propertyId));
  }, [savedIds, propertyId]);

  async function loadProperty() {
    try {
      const { data } = await api.get(`/properties/${propertyId}`);
      setProperty(data);
      // Increment view
      api.post(`/properties/${propertyId}/view`).catch(() => {});
    } catch {
      Alert.alert('Error', 'Could not load property');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      await api.post(`/properties/${propertyId}/save`);
      toggleSave(propertyId);
      setIsSaved(prev => !prev);
    } catch {}
  }

  async function handleReport(reason) {
    try {
      await api.post(`/properties/${propertyId}/report`, { reason });
      setShowReport(false);
      Alert.alert('Report Submitted', 'Our team will review this listing. Thank you.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit report');
    }
  }

  async function handleShare() {
    Share.share({
      message: `Check out this property on Nyumba:\n${property?.title}\n${formatUGX(property?.price)}/month\n${property?.district}, Uganda`,
    });
  }

  if (loading) return (
    <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>
  );

  if (!property) return null;

  const images = property.property_images?.sort((a, b) => a.order_index - b.order_index) || [];
  const landlord = property.users;
  const amenities = Array.isArray(property.amenities) ? property.amenities : [];
  const isOwner = user?.id === property.landlord_id;

  navigation.setOptions({
    headerTitle: '',
    headerRight: () => (
      <View style={{ flexDirection: 'row', gap: 12, marginRight: 8 }}>
        <TouchableOpacity onPress={handleSave}>
          <Icon name={isSaved ? 'heart' : 'heart-outline'} size={24} color={isSaved ? '#E53935' : '#fff'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare}>
          <Icon name="share-variant" size={24} color="#fff" />
        </TouchableOpacity>
        {!isOwner && (
          <TouchableOpacity onPress={() => setShowReport(true)}>
            <Icon name="flag-outline" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    ),
  });

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <ScrollView
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onScroll={e => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
          scrollEventThrottle={16}
        >
          {images.length > 0 ? images.map((img, idx) => (
            <FastImage key={idx} style={{ width, height: 280 }} source={{ uri: img.url }} resizeMode={FastImage.resizeMode.cover} />
          )) : (
            <View style={[{ width, height: 280 }, styles.noImagePlaceholder]}>
              <Text style={{ fontSize: 48 }}>🏠</Text>
              <Text style={{ color: '#999', marginTop: 8 }}>No photos yet</Text>
            </View>
          )}
        </ScrollView>

        {/* Pagination Dots */}
        {images.length > 1 && (
          <View style={styles.dots}>
            {images.map((_, idx) => (
              <View key={idx} style={[styles.dot, activeImage === idx && styles.dotActive]} />
            ))}
          </View>
        )}

        <View style={styles.body}>
          {/* Price & Type */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatUGX(property.price)}<Text style={styles.period}>/{property.price_period}</Text></Text>
            <View style={styles.typeBadge}><Text style={styles.typeText}>{property.type?.replace('_', ' ')}</Text></View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{property.title}</Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <Icon name="map-marker" size={16} color="#666" />
            <Text style={styles.locationText}>
              {[property.town, property.parish, property.district].filter(Boolean).join(', ')}
            </Text>
          </View>

          {property.landmark && (
            <View style={styles.landmarkRow}>
              <Icon name="information" size={14} color={COLORS.primary} />
              <Text style={styles.landmarkText}>Near: {property.landmark}</Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}><Icon name="eye" size={16} color="#888" /><Text style={styles.statText}>{property.views} views</Text></View>
            <View style={styles.stat}><Icon name="email-outline" size={16} color="#888" /><Text style={styles.statText}>{property.inquiries_count || 0} inquiries</Text></View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          {property.description && (
            <>
              <Text style={styles.sectionTitle}>About this property</Text>
              <Text style={styles.description}>{property.description}</Text>
              <View style={styles.divider} />
            </>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {AMENITIES_LIST.filter(a => amenities.includes(a.key)).map(a => (
                  <View key={a.key} style={styles.amenityItem}>
                    <Text style={styles.amenityEmoji}>{a.icon}</Text>
                    <Text style={styles.amenityLabel}>{a.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Map — blurred pin until inquiry */}
          {property.latitude && property.longitude && (
            <>
              <Text style={styles.sectionTitle}>Location</Text>
              <Text style={styles.mapNote}>📍 Exact location shared after inquiry is accepted</Text>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: parseFloat(property.latitude),
                    longitude: parseFloat(property.longitude),
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Circle
                    center={{ latitude: parseFloat(property.latitude), longitude: parseFloat(property.longitude) }}
                    radius={300}
                    fillColor="rgba(27,94,32,0.15)"
                    strokeColor="rgba(27,94,32,0.5)"
                    strokeWidth={2}
                  />
                </MapView>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Landlord Card */}
          {landlord && (
            <>
              <Text style={styles.sectionTitle}>Listed by</Text>
              <TouchableOpacity
                style={styles.landlordCard}
                onPress={() => navigation.navigate('UserProfile', { userId: landlord.id })}
              >
                <FastImage
                  style={styles.landlordAvatar}
                  source={{ uri: landlord.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(landlord.name) + '&background=1B5E20&color=fff' }}
                />
                <View style={styles.landlordInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.landlordName}>{landlord.name}</Text>
                    {landlord.national_id_verified && (
                      <Icon name="shield-check" size={16} color={COLORS.primary} />
                    )}
                  </View>
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={14} color={COLORS.gold} />
                    <Text style={styles.ratingText}>{landlord.rating?.toFixed(1) || 'New'} ({landlord.total_reviews || 0} reviews)</Text>
                  </View>
                  <Text style={styles.memberSince}>Member since {new Date(landlord.created_at).getFullYear()}</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sticky Bottom CTA */}
      {!isOwner && user?.role === 'tenant' && (
        <View style={styles.stickyBottom}>
          <View>
            <Text style={styles.stickyPrice}>{formatUGX(property.price)}</Text>
            <Text style={styles.stickyPeriod}>per {property.price_period}</Text>
          </View>
          <TouchableOpacity
            style={styles.inquiryBtn}
            onPress={() => navigation.navigate('Inquiry', { property })}
          >
            <Icon name="send" size={18} color="#fff" />
            <Text style={styles.inquiryBtnText}>Send Inquiry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Report Modal */}
      {showReport && (
        <View style={styles.reportOverlay}>
          <View style={styles.reportModal}>
            <Text style={styles.reportTitle}>Report this listing</Text>
            {REPORT_REASONS.map(reason => (
              <TouchableOpacity key={reason} style={styles.reportOption} onPress={() => handleReport(reason)}>
                <Text style={styles.reportText}>{reason}</Text>
                <Icon name="chevron-right" size={18} color="#ccc" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.reportCancel} onPress={() => setShowReport(false)}>
              <Text style={styles.reportCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noImagePlaceholder: { backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ccc' },
  dotActive: { backgroundColor: COLORS.primary, width: 18 },
  body: { padding: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  price: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  period: { fontSize: 14, fontWeight: '400', color: '#888' },
  typeBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, textTransform: 'capitalize' },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  locationText: { fontSize: 14, color: '#555' },
  landmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  landmarkText: { fontSize: 13, color: COLORS.primary, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 13, color: '#888' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  description: { fontSize: 14, color: '#555', lineHeight: 22 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F5F5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, width: '47%' },
  amenityEmoji: { fontSize: 16 },
  amenityLabel: { fontSize: 12, color: '#333', fontWeight: '600', flex: 1 },
  mapNote: { fontSize: 12, color: '#888', marginBottom: 8, fontStyle: 'italic' },
  mapContainer: { height: 180, borderRadius: 12, overflow: 'hidden', marginBottom: 4 },
  map: { flex: 1 },
  landlordCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8F8F8', borderRadius: 12, padding: 14 },
  landlordAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E0E0E0' },
  landlordInfo: { flex: 1 },
  landlordName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 13, color: '#666' },
  memberSince: { fontSize: 12, color: '#999', marginTop: 2 },
  stickyBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0', elevation: 10 },
  stickyPrice: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  stickyPeriod: { fontSize: 12, color: '#888' },
  inquiryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 },
  inquiryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  reportOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  reportModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  reportTitle: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 16 },
  reportOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  reportText: { fontSize: 15, color: '#333' },
  reportCancel: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  reportCancelText: { fontSize: 16, color: '#E53935', fontWeight: '700' },
});
