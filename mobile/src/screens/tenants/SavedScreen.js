// mobile/src/screens/tenant/SavedScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { formatUGX } from '../../data/ugandaLocations';

export default function SavedScreen({ navigation }) {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    api.get('/properties/saved/list').then(({ data }) => { setSaved(data); setLoading(false); }).catch(() => setLoading(false));
  }, []));

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#1B5E20" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <View style={styles.header}><Text style={styles.headerTitle}>❤️ Saved Properties</Text></View>
      <FlatList
        data={saved}
        keyExtractor={item => item?.id || Math.random().toString()}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          if (!item) return null;
          const cover = item.property_images?.sort((a,b) => a.order_index - b.order_index)[0]?.url;
          return (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}>
              <FastImage style={styles.img} source={{ uri: cover || 'https://via.placeholder.com/120' }} />
              <View style={styles.info}>
                <Text style={styles.price}>{formatUGX(item.price)}<Text style={{ fontWeight:'400', fontSize:12, color:'#888' }}>/{item.price_period}</Text></Text>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.loc}><Icon name="map-marker" size={13} color="#888" /> {item.town || item.parish || item.district}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems:'center', paddingTop:80 }}>
            <Text style={{ fontSize:48 }}>💔</Text>
            <Text style={{ fontSize:16, fontWeight:'700', color:'#333', marginTop:12 }}>No saved properties</Text>
            <Text style={{ color:'#888', marginTop:6 }}>Tap the heart on any listing to save it</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  header: { backgroundColor:'#1B5E20', paddingHorizontal:16, paddingVertical:14 },
  headerTitle: { fontSize:20, fontWeight:'800', color:'#fff' },
  card: { flexDirection:'row', backgroundColor:'#fff', borderRadius:12, overflow:'hidden', marginBottom:12, elevation:2 },
  img: { width:110, height:90 },
  info: { flex:1, padding:12 },
  price: { fontSize:16, fontWeight:'800', color:'#1B5E20', marginBottom:3 },
  title: { fontSize:14, fontWeight:'600', color:'#1A1A1A', marginBottom:3 },
  loc: { fontSize:12, color:'#888' },
});
