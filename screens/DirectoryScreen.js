
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebaseConfig';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';

const CACHE_KEY = '@directory_hotlines_cache';

// Image component: local fallback kapag walang image o pumalya ang online image.
const SmartImage = ({ uri, defaultSource, style }) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [uri]);

  if (!uri || imageError) {
    return <Image source={defaultSource} style={style} />;
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      onError={() => setImageError(true)}
    />
  );
};

export default function DirectoryScreen() {
  const [hotlines, setHotlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Iwasan ang paulit-ulit na pagsulat ng parehong data.
  const lastSavedDataRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    // 1. I-load muna ang local cache para may data kahit offline.
    const loadCachedData = async () => {
      try {
        const cachedHotlines = await AsyncStorage.getItem(CACHE_KEY);

        if (cachedHotlines !== null && isMounted) {
          const parsedData = JSON.parse(cachedHotlines);

          if (Array.isArray(parsedData)) {
            lastSavedDataRef.current = cachedHotlines;

            if (parsedData.length > 0) {
              setHotlines(parsedData);
            }
          } else {
            console.warn('Cached hotlines format is invalid.');
          }
        }
      } catch (error) {
        console.warn('Unable to read cached hotlines:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCachedData();

    // 2. Makinig sa Firestore updates.
    const hotlinesQuery = query(
      collection(db, 'hotlines'),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      hotlinesQuery,
      { includeMetadataChanges: true },
      async (snapshot) => {
        if (!isMounted) return;

        const fromCache = snapshot.metadata.fromCache;
        setIsOffline(fromCache);

        const data = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        // Huwag palitan ang existing data ng empty result.
        if (data.length > 0) {
          setHotlines(data);

          // Cache lamang kapag galing sa server, hindi local Firestore cache.
          if (!fromCache) {
            try {
              const serializedData = JSON.stringify(data);

              // Skip kung pareho ang data na huling na-save.
              if (serializedData !== lastSavedDataRef.current) {
                await AsyncStorage.setItem(
                  CACHE_KEY,
                  serializedData
                );

                lastSavedDataRef.current = serializedData;
              }
            } catch (error) {
              // Hindi dapat bumagsak ang Directory screen kapag puno ang storage.
              console.warn(
                'Unable to save hotline cache. Check device storage:',
                error?.message || error
              );
            }
          }
        }

        if (isMounted) {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Firestore hotline listener error:', error);

        if (isMounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Categories na para lamang sa Directory.
  const normalizeCategory = (category) =>
    String(category || '').trim().toLowerCase();

  const policeStations = hotlines.filter(
    (hotline) => normalizeCategory(hotline.category) === 'police'
  );

  const barangays = hotlines.filter(
    (hotline) => normalizeCategory(hotline.category) === 'barangay'
  );

  const otherHotlines = hotlines.filter((hotline) => {
    const category = normalizeCategory(hotline.category);

    // "other" ay kasama para sa mga lumang record na
    // na-save bago inayos ang admin category value.
    return (
      category === 'other emergency hotlines' ||
      category === 'other'
    );
  });

  // Static emergency contacts.
  const emergency911 = {
    name: '911',
    number: '911',
    logo: require('../assets/paynal_911.png'),
  };

  const ocpoHotline = {
    name: 'Olongapo CPO',
    number: '09985985546',
    logo: require('../assets/OCPO.png'),
  };

  const callNumber = async (number) => {
    if (!number) {
      console.warn('No hotline number is available.');
      return;
    }

    try {
      await Linking.openURL(`tel:${number}`);
    } catch (error) {
      console.warn('Unable to open phone dialer:', error);
    }
  };

  // Gumawa ng grid na may tatlong columns.
  const renderGrid = (items, columns = 3) => {
    const rows = [];

    for (let i = 0; i < items.length; i += columns) {
      const rowItems = items.slice(i, i + columns);

      while (rowItems.length < columns) {
        rowItems.push(null);
      }

      rows.push(rowItems);
    }

    return rows.map((row, rowIndex) => (
      <View
        key={`row-${rowIndex}`}
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-start',
          marginBottom: 20,
        }}
      >
        {row.map((item, index) =>
          item ? (
            <TouchableOpacity
              key={item.id || `${rowIndex}-${index}`}
              onPress={() => callNumber(item.number)}
              style={{
                alignItems: 'center',
                flex: 1,
                paddingHorizontal: 4,
              }}
            >
              <SmartImage
                uri={item.imageUrl}
                defaultSource={require('../assets/OCPO.png')}
                style={{
                  width: 70,
                  height: 70,
                  marginBottom: 5,
                  borderWidth: 1,
                  borderColor: '#000',
                  borderRadius: 10,
                  backgroundColor: '#f9f9f9',
                }}
              />

              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                {item.name || 'Hotline'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              key={`empty-${rowIndex}-${index}`}
              style={{ flex: 1 }}
            />
          )
        )}
      </View>
    ));
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff',
        }}
      >
        <ActivityIndicator size="large" color="#0047AB" />
        <Text style={{ marginTop: 10 }}>
          Accessing Directory...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 70,
        backgroundColor: '#fff',
      }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {isOffline && (
        <View
          style={{
            backgroundColor: '#FF8C00',
            padding: 5,
            borderRadius: 5,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              color: '#fff',
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 'bold',
            }}
          >
            OFFLINE MODE - USING CACHED DATA
          </Text>
        </View>
      )}

      <View
        style={{
          alignItems: 'center',
          marginBottom: 10,
          marginTop: -20,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
          }}
        >
          Welcome to{' '}
          <Text style={{ color: '#000' }}>
            Olongapo City Emergency Hotlines
          </Text>
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => callNumber(emergency911.number)}
        style={{ alignItems: 'center', marginBottom: 20 }}
      >
        <Image
          source={emergency911.logo}
          style={{
            width: 200,
            height: 200,
            marginTop: -10,
            resizeMode: 'contain',
          }}
        />

        <Text
          style={{
            fontSize: 25,
            fontWeight: 'bold',
            textAlign: 'center',
            marginTop: -5,
          }}
        >
          {emergency911.name}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => callNumber(ocpoHotline.number)}
        style={{ alignItems: 'center', marginBottom: 30 }}
      >
        <Image
          source={ocpoHotline.logo}
          style={{
            width: 160,
            height: 160,
            resizeMode: 'contain',
          }}
        />

        <Text
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            textAlign: 'center',
            marginTop: -30,
          }}
        >
          {ocpoHotline.name}
        </Text>
      </TouchableOpacity>

      {policeStations.length > 0 && (
        <>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 30,
              marginTop: 20,
            }}
          >
            POLICE STATIONS
          </Text>

          {renderGrid(policeStations)}
        </>
      )}

      {otherHotlines.length > 0 && (
        <>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              textAlign: 'center',
              marginTop: 50,
              marginBottom: 30,
            }}
          >
            OTHER EMERGENCY HOTLINES
          </Text>

          {renderGrid(otherHotlines)}
        </>
      )}

      {barangays.length > 0 && (
        <>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              textAlign: 'center',
              marginTop: 50,
              marginBottom: 30,
            }}
          >
            BARANGAYS
          </Text>

          {renderGrid(barangays)}
        </>
      )}
    </ScrollView>
  );
}