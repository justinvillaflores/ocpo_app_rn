import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Linking, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';

const CACHE_KEY = '@directory_hotlines_cache';
const REQUEST_TIMEOUT = 15000;
const DEFAULT_LOGO = require('../assets/OCPO.png');

const styles = {
  page: { flex: 1, paddingHorizontal: 20, paddingTop: 70, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#fff' },
  heading: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginTop: 30, marginBottom: 25 },
  tile: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  logo: { width: 70, height: 70, marginBottom: 5, borderWidth: 1, borderColor: '#000', borderRadius: 10, backgroundColor: '#f9f9f9' },
  label: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  offline: { backgroundColor: '#FF8C00', padding: 6, borderRadius: 5, marginBottom: 10 },
  offlineText: { color: '#fff', textAlign: 'center', fontSize: 10, fontWeight: 'bold' },
  message: { marginTop: 10, textAlign: 'center', color: '#555', fontSize: 14, lineHeight: 20 },
  retryButton: { marginTop: 18, backgroundColor: '#0047AB', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  mainTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
  emergencyImage: { width: 200, height: 200, marginTop: -10, resizeMode: 'contain' },
  emergencyNumber: { fontSize: 25, fontWeight: 'bold', textAlign: 'center', marginTop: -5 },
  ocpoImage: { width: 160, height: 160, resizeMode: 'contain' },
  ocpoTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginTop: -30 },
  emergencyButton: { alignItems: 'center', marginBottom: 20 },
  ocpoButton: { alignItems: 'center', marginBottom: 30 },
  bottomContent: { paddingBottom: 100 },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#555', fontSize: 14 }
};

const normalize = (doc) => {
  const d = doc.data();
  return {
    ...d,
    id: doc.id,
    name: d.name || d.title || d.hotlineName || 'Hotline',
    number: d.number || d.phoneNumber || d.contactNumber || d.hotlineNumber || d.phone || '',
    category: String(d.category || d.type || 'other').trim().toLowerCase(),
    imageUrl: d.imageUrl || d.logoUrl || d.image || d.logo || null
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
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    let active = true;
    let unsubscribe;
    let savedData = [];
    let receivedServerData = false;
    let settled = false;

    const clearRequestTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const start = async () => {
      setLoading(true);
      setLoadError(false);
      setIsOffline(false);

      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            savedData = parsed;
            if (active && parsed.length > 0) {
              setHotlines(parsed);
              setHasLoaded(true);
              setLoading(false);
            }
          }
        }
      } catch (e) {
        console.warn('Unable to load saved directory:', e);
      }

      if (!active) return;

      timeoutRef.current = setTimeout(() => {
        if (!active || receivedServerData || settled) return;

        settled = true;
        setIsOffline(true);
        setLoading(false);

        if (savedData.length === 0) {
          setLoadError(true);
        }
      }, REQUEST_TIMEOUT);

      try {
        unsubscribe = onSnapshot(
          collection(db, 'hotlines'),
          { includeMetadataChanges: true },
          async (snapshot) => {
            if (!active) return;

            const fromCache = snapshot.metadata.fromCache;
            const data = snapshot.docs
              .map(normalize)
              .sort((a, b) => a.name.localeCompare(b.name));

            if (!fromCache) {
              receivedServerData = true;
              settled = true;
              clearRequestTimeout();
              setIsOffline(false);
              setLoadError(false);
              setLoading(false);
              setHasLoaded(true);
              setHotlines(data);
              savedData = data;

              try {
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
              } catch (e) {
                console.warn('Unable to save directory:', e);
              }

              return;
            }

            setIsOffline(true);

            if (savedData.length > 0) {
              setHotlines(savedData);
              setLoading(false);
              setHasLoaded(true);
              return;
            }

            if (data.length > 0) {
              setHotlines(data);
              setLoading(false);
              setHasLoaded(true);
              savedData = data;
              try {
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
              } catch (e) {
                console.warn('Unable to save directory:', e);
              }
              return;
            }

            if (settled && !hasLoaded) {
              setLoading(false);
              setLoadError(true);
            }
          },
          (error) => {
            console.warn('Directory sync error:', error);
            if (!active) return;

            settled = true;
            clearRequestTimeout();
            setIsOffline(true);
            setLoading(false);

            if (savedData.length === 0) {
              setLoadError(true);
            }
          }
        );
      } catch (error) {
        console.warn('Unable to start directory listener:', error);
        if (!active) return;

        settled = true;
        clearRequestTimeout();
        setIsOffline(true);
        setLoading(false);

        if (savedData.length === 0) {
          setLoadError(true);
        }
      }
    };

    start();

    return () => {
      active = false;
      clearRequestTimeout();
      if (unsubscribe) unsubscribe();
    };
  }, [retryKey]);

  const callNumber = async (number) => {
    if (!number) return;
    try {
      await Linking.openURL(`tel:${String(number).replace(/[^\d+\*#,;]/g, '')}`);
    } catch (e) {
      console.warn('Unable to open phone dialer:', e);
    }
  };

  const retryLoading = () => {
    setLoadError(false);
    setRetryKey((previous) => previous + 1);
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
        {Array.from({ length: 3 - row.length }, (_, i) => (
          <View key={`empty-${ri}-${i}`} style={{ flex: 1 }} />
        ))}
      </View>
    ));
  };

  if (loading && hotlines.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0047AB" />
        <Text style={styles.message}>Loading directory...</Text>
      </View>
    );
  }

  if (loadError && hotlines.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#333' }}>
          Unable to Load Directory
        </Text>
        <Text style={styles.message}>
          The directory request timed out or failed. Please try again.
        </Text>
        <TouchableOpacity onPress={retryLoading} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.bottomContent}>
      {isOffline && (
        <View style={styles.offline}>
          <Text style={styles.offlineText}>OFFLINE MODE - USING SAVED DATA</Text>
        </View>
      )}

      <Text style={styles.mainTitle}>
        Welcome to{' '}
        <Text style={{ color: '#000' }}>Olongapo City Emergency Hotlines</Text>
      </Text>

      <TouchableOpacity onPress={() => callNumber('911')} style={styles.emergencyButton}>
        <Image source={require('../assets/paynal_911.png')} style={styles.emergencyImage} />
        <Text style={styles.emergencyNumber}>911</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => callNumber('09985985546')} style={styles.ocpoButton}>
        <Image source={require('../assets/OCPO.png')} style={styles.ocpoImage} />
        <Text style={styles.ocpoTitle}>Olongapo CPO</Text>
      </TouchableOpacity>

      {police.length > 0 && (
        <>
          <Text style={styles.heading}>POLICE STATIONS</Text>
          {renderGrid(police)}
        </>
      )}

      {others.length > 0 && (
        <>
          <Text style={[styles.heading, { marginTop: 50 }]}>OTHER EMERGENCY HOTLINES</Text>
          {renderGrid(others)}
        </>
      )}

      {barangays.length > 0 && (
        <>
          <Text style={[styles.heading, { marginTop: 50 }]}>BARANGAYS</Text>
          {renderGrid(barangays)}
        </>
      )}

      {!hotlines.length && !loadError && (
        <Text style={styles.emptyText}>No saved contacts available.</Text>
      )}
    </ScrollView>
  );
}