
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Linking, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';

const CACHE_KEY = '@directory_hotlines_cache';
const DEFAULT_LOGO = require('../assets/OCPO.png');
const styles = {
  page: { flex: 1, paddingHorizontal: 20, paddingTop: 70, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  heading: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginTop: 30, marginBottom: 25 },
  tile: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  logo: { width: 70, height: 70, marginBottom: 5, borderWidth: 1, borderColor: '#000', borderRadius: 10, backgroundColor: '#f9f9f9' },
  label: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  offline: { backgroundColor: '#FF8C00', padding: 6, borderRadius: 5, marginBottom: 10 },
  offlineText: { color: '#fff', textAlign: 'center', fontSize: 10, fontWeight: 'bold' },
};

const normalize = (doc) => {
  const d = doc.data();
  return {
    ...d,
    id: doc.id,
    name: d.name || d.title || d.hotlineName || 'Hotline',
    number: d.number || d.phoneNumber || d.contactNumber || d.hotlineNumber || d.phone || '',
    category: String(d.category || d.type || 'other').trim().toLowerCase(),
    imageUrl: d.imageUrl || d.logoUrl || d.image || d.logo || null,
  };
};

const SmartImage = ({ uri }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return <Image source={uri && !failed ? { uri } : DEFAULT_LOGO} style={styles.logo} onError={() => setFailed(true)} />;
};

export default function DirectoryScreen() {
  const [hotlines, setHotlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe;
    let savedData = [];

    const start = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            savedData = parsed;
            if (active) setHotlines(parsed);
          }
        }
      } catch (e) {
        console.warn('Unable to load saved directory:', e);
      } finally {
        if (active) setLoading(false);
      }

      if (!active) return;

      unsubscribe = onSnapshot(
        collection(db, 'hotlines'),
        async (snapshot) => {
          if (!active) return;

          const fromCache = snapshot.metadata.fromCache;
          const data = snapshot.docs.map(normalize).sort((a, b) => a.name.localeCompare(b.name));
          setIsOffline(fromCache);

          if (fromCache && savedData.length > data.length) return;

          setHotlines(data);
          savedData = data;

          try {
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
          } catch (e) {
            console.warn('Unable to save directory:', e);
          }
        },
        (error) => {
          console.warn('Directory sync error:', error);
          if (active) {
            setIsOffline(true);
            setLoading(false);
          }
        }
      );
    };

    start();
    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const callNumber = async (number) => {
    if (!number) return;
    try {
      await Linking.openURL(`tel:${String(number).replace(/[^\d+*#,;]/g, '')}`);
    } catch (e) {
      console.warn('Unable to open phone dialer:', e);
    }
  };

  const police = hotlines.filter((h) => h.category === 'police');
  const barangays = hotlines.filter((h) => h.category === 'barangay');
  const others = hotlines.filter((h) => ['other', 'other emergency hotlines'].includes(h.category));

  const renderGrid = (items) => {
    const rows = [];
    for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));

    return rows.map((row, ri) => (
      <View key={ri} style={{ flexDirection: 'row', marginBottom: 20 }}>
        {row.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => callNumber(item.number)} style={styles.tile}>
            <SmartImage uri={item.imageUrl} />
            <Text style={styles.label}>{item.name}</Text>
          </TouchableOpacity>
        ))}
        {Array.from({ length: 3 - row.length }, (_, i) => <View key={`empty-${ri}-${i}`} style={{ flex: 1 }} />)}
      </View>
    ));
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0047AB" /><Text style={{ marginTop: 10 }}>Accessing Directory...</Text></View>;
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 100 }}>
      {isOffline && <View style={styles.offline}><Text style={styles.offlineText}>OFFLINE MODE - USING SAVED DATA</Text></View>}

      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 }}>
        Welcome to{' '}
        <Text style={{ color: '#000' }}>Olongapo City Emergency Hotlines</Text>
      </Text>

      <TouchableOpacity onPress={() => callNumber('911')} style={{ alignItems: 'center', marginBottom: 20 }}>
        <Image source={require('../assets/paynal_911.png')} style={{ width: 200, height: 200, marginTop: -10, resizeMode: 'contain' }} />
        <Text style={{ fontSize: 25, fontWeight: 'bold', textAlign: 'center', marginTop: -5 }}>911</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => callNumber('09985985546')} style={{ alignItems: 'center', marginBottom: 30 }}>
        <Image source={require('../assets/OCPO.png')} style={{ width: 160, height: 160, resizeMode: 'contain' }} />
        <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginTop: -30 }}>Olongapo CPO</Text>
      </TouchableOpacity>

      {police.length > 0 && <><Text style={styles.heading}>POLICE STATIONS</Text>{renderGrid(police)}</>}
      {others.length > 0 && <><Text style={[styles.heading, { marginTop: 50 }]}>OTHER EMERGENCY HOTLINES</Text>{renderGrid(others)}</>}
      {barangays.length > 0 && <><Text style={[styles.heading, { marginTop: 50 }]}>BARANGAYS</Text>{renderGrid(barangays)}</>}
      {!hotlines.length && <Text style={{ textAlign: 'center', marginTop: 20 }}>No saved contacts available. Connect to the internet to load the directory.</Text>}
    </ScrollView>
  );
}
