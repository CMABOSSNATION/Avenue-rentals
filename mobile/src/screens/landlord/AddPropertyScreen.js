// mobile/src/screens/landlord/AddPropertyScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, SafeAreaView, Modal, FlatList,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../services/api';
import { ALL_DISTRICTS, DISTRICT_TOWNS, PROPERTY_TYPES, AMENITIES_LIST } from '../../data/ugandaLocations';

const COLORS = { primary: '#1B5E20', gold: '#F9A825', bg: '#F5F5F5' };

const STEPS = ['Basic Info', 'Location', 'Photos', 'Amenities', 'Verification'];

export default function AddPropertyScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [createdPropertyId, setCreatedPropertyId] = useState(null);

  // Step 1
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [pricePeriod, setPricePeriod] = useState('month');

  // Step 2
  const [district, setDistrict] = useState('');
  const [town, setTown] = useState('');
  const [parish, setParish] = useState('');
  const [area, setArea] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showTownPicker, setShowTownPicker] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');

  // Step 3
  const [photos, setPhotos] = useState([]);

  // Step 4
  const [amenities, setAmenities] = useState([]);

  // Step 5
  const [video, setVideo] = useState(null);

  function nextStep() { if (step < 4) setStep(step + 1); }
  function prevStep() { if (step > 0) setStep(step - 1); }

  function toggleAmenity(key) {
    setAmenities(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);
  }

  async function pickPhotos() {
    if (photos.length >= 10) { Alert.alert('Limit', 'Maximum 10 photos allowed'); return; }
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 10 - photos.length, quality: 0.8 });
    if (result.assets) setPhotos(prev => [...prev, ...result.assets].slice(0, 10));
  }

  async function pickVideo() {
    const result = await launchImageLibrary({ mediaType: 'video', videoQuality: 'medium' });
    if (result.assets?.[0]) setVideo(result.assets[0]);
  }

  function removePhoto(idx) {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!video) { Alert.alert('Video Required', 'Please record a walkthrough video'); return; }
    setSaving(true);
    try {
      // 1. Create property
      let propertyId = createdPropertyId;
      if (!propertyId) {
        const { data } = await api.post('/properties', {
          title, type, description, price: parseInt(price),
          price_period: pricePeriod, district, town, parish,
          area, full_address: fullAddress, landmark, amenities,
        });
        propertyId = data.property.id;
        setCreatedPropertyId(propertyId);
      }

      // 2. Upload photos (in real app, upload to Supabase storage first)
      // Here we simulate with local URIs
      const imageData = photos.map((p, idx) => ({
        url: p.uri, // Replace with Supabase storage URL after upload
        order_index: idx,
      }));
      if (imageData.length > 0) {
        await api.post(`/properties/${propertyId}/images`, { images: imageData });
      }

      // 3. Upload video (in real app, upload to Supabase storage first)
      await api.post(`/properties/${propertyId}/video`, { video_url: video.uri });

      Alert.alert(
        '🎉 Listing Submitted!',
        'Your property has been submitted for review. We will notify you within 24 hours via WhatsApp.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit listing');
    } finally {
      setSaving(false);
    }
  }

  async function saveAndNext() {
    // Validate current step
    if (step === 0) {
      if (!title.trim()) { Alert.alert('Required', 'Please enter a title'); return; }
      if (!type) { Alert.alert('Required', 'Please select property type'); return; }
      if (!price || isNaN(parseInt(price))) { Alert.alert('Required', 'Please enter a valid price'); return; }
    }
    if (step === 1) {
      if (!district) { Alert.alert('Required', 'Please select a district'); return; }
    }
    if (step === 2 && photos.length === 0) {
      Alert.alert('Photos Required', 'Please add at least 1 photo');
      return;
    }
    if (step === 4) { handleSubmit(); return; }
    nextStep();
  }

  const filteredDistricts = ALL_DISTRICTS.filter(d => d.toLowerCase().includes(districtSearch.toLowerCase()));
  const availableTowns = DISTRICT_TOWNS[district] || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.stepWrap}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive, i < step && styles.stepDotDone]}>
              {i < step ? <Icon name="check" size={12} color="#fff" /> : <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>}
            </View>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && styles.stepLineDone]} />}
          </View>
        ))}
      </View>
      <Text style={styles.stepLabel}>{STEPS[step]}</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* ─── Step 1: Basic Info ─── */}
        {step === 0 && (
          <>
            <Text style={styles.fieldLabel}>Property Title *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Spacious 2-bedroom in Ntinda" placeholderTextColor="#aaa" />

            <Text style={styles.fieldLabel}>Property Type *</Text>
            <View style={styles.typeGrid}>
              {PROPERTY_TYPES.map(t => (
                <TouchableOpacity key={t.value} style={[styles.typeBtn, type === t.value && styles.typeBtnActive]} onPress={() => setType(t.value)}>
                  <Text style={[styles.typeBtnText, type === t.value && styles.typeBtnTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Monthly Rent (UGX) *</Text>
            <View style={styles.priceRow}>
              <Text style={styles.ugxPrefix}>UGX</Text>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="e.g. 300000" placeholderTextColor="#aaa" />
            </View>
            <View style={styles.periodRow}>
              {['month', 'year'].map(p => (
                <TouchableOpacity key={p} style={[styles.periodBtn, pricePeriod === p && styles.periodBtnActive]} onPress={() => setPricePeriod(p)}>
                  <Text style={[styles.periodBtnText, pricePeriod === p && styles.periodBtnTextActive]}>Per {p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="Describe the property, what's included, rules, etc." placeholderTextColor="#aaa" multiline numberOfLines={4} textAlignVertical="top" />
          </>
        )}

        {/* ─── Step 2: Location ─── */}
        {step === 1 && (
          <>
            <Text style={styles.fieldLabel}>District *</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowDistrictPicker(true)}>
              <Text style={[styles.pickerText, !district && styles.pickerPlaceholder]}>{district || 'Select district...'}</Text>
              <Icon name="chevron-down" size={20} color="#888" />
            </TouchableOpacity>

            {district && availableTowns.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Town / Area</Text>
                <TouchableOpacity style={styles.picker} onPress={() => setShowTownPicker(true)}>
                  <Text style={[styles.pickerText, !town && styles.pickerPlaceholder]}>{town || 'Select town...'}</Text>
                  <Icon name="chevron-down" size={20} color="#888" />
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.fieldLabel}>Parish / Neighbourhood</Text>
            <TextInput style={styles.input} value={parish} onChangeText={setParish} placeholder="e.g. Ntinda, Ruharo" placeholderTextColor="#aaa" />

            <Text style={styles.fieldLabel}>Area / Street</Text>
            <TextInput style={styles.input} value={area} onChangeText={setArea} placeholder="e.g. Behind Shell station, Kyanja Road" placeholderTextColor="#aaa" />

            <Text style={styles.fieldLabel}>Full Address</Text>
            <TextInput style={styles.input} value={fullAddress} onChangeText={setFullAddress} placeholder="Plot 12, Block 4, Ntinda" placeholderTextColor="#aaa" />

            <Text style={styles.fieldLabel}>Landmark (helps tenants find you)</Text>
            <TextInput style={styles.input} value={landmark} onChangeText={setLandmark} placeholder="e.g. Near Makerere University Gate 1" placeholderTextColor="#aaa" />

            <View style={styles.infoBox}>
              <Icon name="information" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>Exact location only shared with tenants after you accept their inquiry</Text>
            </View>
          </>
        )}

        {/* ─── Step 3: Photos ─── */}
        {step === 2 && (
          <>
            <View style={styles.photoHeader}>
              <Text style={styles.photoCount}>{photos.length}/10 photos</Text>
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhotos} disabled={photos.length >= 10}>
                <Icon name="camera-plus" size={18} color="#fff" />
                <Text style={styles.addPhotoBtnText}>Add Photos</Text>
              </TouchableOpacity>
            </View>

            {photos.length === 0 ? (
              <TouchableOpacity style={styles.photoPlaceholder} onPress={pickPhotos}>
                <Icon name="image-multiple-outline" size={48} color="#ccc" />
                <Text style={styles.photoPlaceholderText}>Tap to add photos</Text>
                <Text style={styles.photoPlaceholderSub}>First photo will be the cover image</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.photoGrid}>
                {photos.map((p, idx) => (
                  <View key={idx} style={styles.photoWrap}>
                    <FastImage style={styles.photo} source={{ uri: p.uri }} />
                    {idx === 0 && <View style={styles.coverBadge}><Text style={styles.coverText}>Cover</Text></View>}
                    <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(idx)}>
                      <Icon name="close-circle" size={22} color="#E53935" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.infoBox}>
              <Icon name="lightbulb" size={16} color={COLORS.gold} />
              <Text style={styles.infoText}>Good photos = more inquiries. Use bright natural lighting. Show all rooms, bathroom, and compound.</Text>
            </View>
          </>
        )}

        {/* ─── Step 4: Amenities ─── */}
        {step === 3 && (
          <>
            <Text style={styles.subtitle}>Select all amenities available at this property</Text>
            {AMENITIES_LIST.map(a => (
              <TouchableOpacity key={a.key} style={[styles.amenityRow, amenities.includes(a.key) && styles.amenityRowActive]} onPress={() => toggleAmenity(a.key)}>
                <Text style={styles.amenityEmoji}>{a.icon}</Text>
                <Text style={[styles.amenityLabel, amenities.includes(a.key) && styles.amenityLabelActive]}>{a.label}</Text>
                <View style={[styles.checkbox, amenities.includes(a.key) && styles.checkboxActive]}>
                  {amenities.includes(a.key) && <Icon name="check" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ─── Step 5: Verification Video ─── */}
        {step === 4 && (
          <>
            <View style={styles.videoInstructions}>
              <Text style={styles.videoTitle}>📹 Verification Video</Text>
              <Text style={styles.videoSubtitle}>This video proves you own/manage the property</Text>
              <View style={styles.instructionsList}>
                {[
                  'Walk through all rooms',
                  'Show the front door and lock',
                  'Unlock the door on camera',
                  'Show the compound/yard',
                  'State your name and property location',
                ].map((inst, i) => (
                  <View key={i} style={styles.instructionItem}>
                    <Text style={styles.instructionNum}>{i + 1}</Text>
                    <Text style={styles.instructionText}>{inst}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity style={[styles.videoUploadBtn, video && styles.videoUploadBtnDone]} onPress={pickVideo}>
              <Icon name={video ? 'check-circle' : 'video-plus'} size={32} color={video ? '#fff' : COLORS.primary} />
              <Text style={[styles.videoUploadText, video && { color: '#fff' }]}>
                {video ? '✅ Video selected — ready to submit' : 'Select Verification Video'}
              </Text>
              {video && <Text style={styles.videoName} numberOfLines={1}>{video.fileName || 'video.mp4'}</Text>}
            </TouchableOpacity>

            <View style={styles.reviewNote}>
              <Icon name="clock-outline" size={18} color={COLORS.primary} />
              <Text style={styles.reviewNoteText}>
                Your listing will be reviewed within 24 hours. You will be notified via WhatsApp once approved.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navBtns}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
            <Icon name="arrow-left" size={18} color={COLORS.primary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.nextBtn, saving && styles.nextBtnDisabled]} onPress={saveAndNext} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.nextBtnText}>{step === 4 ? 'Submit for Review' : 'Next'}</Text>
              {step < 4 && <Icon name="arrow-right" size={18} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* District Picker Modal */}
      <Modal visible={showDistrictPicker} animationType="slide" onRequestClose={() => setShowDistrictPicker(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select District</Text>
            <TouchableOpacity onPress={() => setShowDistrictPicker(false)}><Icon name="close" size={24} color="#333" /></TouchableOpacity>
          </View>
          <View style={styles.modalSearchBox}>
            <Icon name="magnify" size={18} color="#999" />
            <TextInput style={styles.modalSearchInput} placeholder="Search districts..." value={districtSearch} onChangeText={setDistrictSearch} autoFocus />
          </View>
          <FlatList
            data={filteredDistricts}
            keyExtractor={d => d}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setDistrict(item); setTown(''); setShowDistrictPicker(false); setDistrictSearch(''); }}>
                <Text style={[styles.modalItemText, district === item && { color: COLORS.primary, fontWeight: '700' }]}>{item}</Text>
                {district === item && <Icon name="check" size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Town Picker Modal */}
      <Modal visible={showTownPicker} animationType="slide" onRequestClose={() => setShowTownPicker(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Town in {district}</Text>
            <TouchableOpacity onPress={() => setShowTownPicker(false)}><Icon name="close" size={24} color="#333" /></TouchableOpacity>
          </View>
          <FlatList
            data={availableTowns}
            keyExtractor={t => t}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setTown(item); setShowTownPicker(false); }}>
                <Text style={[styles.modalItemText, town === item && { color: COLORS.primary, fontWeight: '700' }]}>{item}</Text>
                {town === item && <Icon name="check" size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  progress: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  stepWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepDotDone: { backgroundColor: COLORS.primary },
  stepNum: { fontSize: 12, fontWeight: '700', color: '#999' },
  stepNumActive: { color: '#fff' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E0E0E0', marginHorizontal: 4 },
  stepLineDone: { backgroundColor: COLORS.primary },
  stepLabel: { textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A', marginBottom: 4, backgroundColor: '#FAFAFA' },
  textarea: { minHeight: 100 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeBtn: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FAFAFA' },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  typeBtnTextActive: { color: '#fff' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ugxPrefix: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  periodRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  periodBtn: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  periodBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  periodBtnTextActive: { color: '#fff' },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#FAFAFA', marginBottom: 4 },
  pickerText: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  pickerPlaceholder: { color: '#aaa' },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginTop: 12 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.primary, lineHeight: 18 },
  photoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  photoCount: { fontSize: 15, fontWeight: '600', color: '#555' },
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addPhotoBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  photoPlaceholder: { height: 160, borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  photoPlaceholderText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 8 },
  photoPlaceholderSub: { fontSize: 13, color: '#ccc', marginTop: 4 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { position: 'relative' },
  photo: { width: 100, height: 100, borderRadius: 8 },
  coverBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: COLORS.gold, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  coverText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  removePhotoBtn: { position: 'absolute', top: -6, right: -6 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 12 },
  amenityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 12 },
  amenityRowActive: { backgroundColor: '#F1F8E9' },
  amenityEmoji: { fontSize: 22, width: 30 },
  amenityLabel: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  amenityLabelActive: { color: COLORS.primary, fontWeight: '700' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  videoInstructions: { backgroundColor: '#F1F8E9', borderRadius: 12, padding: 16, marginBottom: 20 },
  videoTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  videoSubtitle: { fontSize: 13, color: '#555', marginBottom: 12 },
  instructionsList: { gap: 8 },
  instructionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  instructionNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary, textAlign: 'center', lineHeight: 22, fontSize: 12, fontWeight: '700', color: '#fff' },
  instructionText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  videoUploadBtn: { borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: 12, padding: 24, alignItems: 'center', gap: 8, marginBottom: 16 },
  videoUploadBtnDone: { backgroundColor: COLORS.primary, borderStyle: 'solid' },
  videoUploadText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  videoName: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  reviewNote: { flexDirection: 'row', gap: 10, backgroundColor: '#E3F2FD', borderRadius: 10, padding: 14 },
  reviewNoteText: { flex: 1, fontSize: 13, color: '#1565C0', lineHeight: 20 },
  navBtns: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14 },
  backBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  nextBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14 },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  modalSearchInput: { flex: 1, fontSize: 15, color: '#333' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  modalItemText: { fontSize: 15, color: '#333' },
});
