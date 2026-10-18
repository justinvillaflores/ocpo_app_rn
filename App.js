
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DirectoryScreen from './screens/DirectoryScreen';
import ServicesScreen from './screens/ServicesScreen';
import MessagesScreen from './screens/MessagesScreen';
import AnnounceScreen from './screens/AnnounceScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthScreen from './screens/AuthScreen';
import CustomTabBar from './CustomTabBar';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen name="Directory" component={DirectoryScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Announce" component={AnnounceScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Linisin at pag-isahin ang address components.
function cleanAddress(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
}

function sameArea(a, b) {
  return cleanAddress(a).toLowerCase() === cleanAddress(b).toLowerCase();
}

function getLocationAddress(place) {
  if (!place) {
    return { street: '', barangay: '' };
  }

  const street = [
    cleanAddress(place.streetNumber),
    cleanAddress(place.street)
  ].filter(Boolean).join(' ');

  const province = cleanAddress(place.subregion);
  const region = cleanAddress(place.region);
  const city = cleanAddress(place.city);
  const streetName = cleanAddress(place.street);
  const district = cleanAddress(place.district);
  const subLocality = cleanAddress(place.subLocality);
  const name = cleanAddress(place.name);

  // Huwag gamitin ang province o region bilang barangay.
  const validBarangay = (value) => {
    if (!value) return '';
    if (sameArea(value, province) || sameArea(value, region) || sameArea(value, city)) return '';
    if (sameArea(value, streetName) || sameArea(value, street)) return '';
    return value;
  };

  const barangay = validBarangay(district) ||
    validBarangay(subLocality) ||
    validBarangay(name) || '';

  return { street, barangay };
}

async function getAddressFromCoordinates(latitude, longitude) {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = results?.[0];
    return getLocationAddress(place);
  } catch (error) {
    console.log('Reverse geocoding error:', error);
    return { street: '', barangay: '' };
  }
}

async function saveUserLocation(uid, coords) {
  const latitude = coords.latitude;
  const longitude = coords.longitude;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

  const address = await getAddressFromCoordinates(latitude, longitude);

  await setDoc(doc(db, 'users', uid), {
    lastKnownLat: latitude,
    lastKnownLon: longitude,
    lastKnownStreet: address.street || '',
    lastKnownBarangay: address.barangay || '',
    lastLocationUpdate: serverTimestamp()
  }, { merge: true });
}

export default function App() {
  const [showNotice, setShowNotice] = useState(false);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const locationSubscription = useRef(null);
  const activeUid = useRef(null);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const agreed = await AsyncStorage.getItem('hasAgreedToNotice');
        if (mounted && agreed !== 'true') setShowNotice(true);
      } catch (error) {
        console.log('Notice loading error:', error);
      }
    };

    initialize();

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!mounted) return;

      setUser(currentUser);
      setInitializing(false);

      if (activeUid.current !== currentUser?.uid) {
        locationSubscription.current?.remove();
        locationSubscription.current = null;
        activeUid.current = currentUser?.uid || null;
      }

      if (!currentUser || locationSubscription.current) return;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !mounted || auth.currentUser?.uid !== currentUser.uid) return;

        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });

        await saveUserLocation(currentUser.uid, initialLocation.coords);

        if (!mounted || auth.currentUser?.uid !== currentUser.uid) return;

        locationSubscription.current = await Location.watchPositionAsync({
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 10
        }, async (location) => {
          try {
            if (auth.currentUser?.uid !== currentUser.uid) return;
            await saveUserLocation(currentUser.uid, location.coords);
          } catch (error) {
            console.log('Saving location error:', error);
          }
        });
      } catch (error) {
        console.log('Location tracking error:', error);
      }
    });

    return () => {
      mounted = false;
      unsubscribeAuth();
      locationSubscription.current?.remove();
      locationSubscription.current = null;
    };
  }, []);

  const handleAgree = async () => {
    try {
      await AsyncStorage.setItem('hasAgreedToNotice', 'true');
      setShowNotice(false);
    } catch (error) {
      console.log('Saving notice agreement failed:', error);
    }
  };

  if (initializing) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#003399" /></View>;
  }

  return (
    <>
      <Modal visible={showNotice} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>Notice to the Public</Text>
              <Text style={styles.body}>
                Welcome to the Olongapo City Hotlines mobile application. Please read this disclaimer before continuing.
              </Text>
              <Text style={styles.body}>
                <Text style={styles.bold}>1. General Information: </Text>
                This app provides access to emergency contact numbers and public service hotlines. Information may not always be complete or up to date.
              </Text>
              <Text style={styles.body}>
                <Text style={styles.bold}>2. Service Limitations: </Text>
                Some features require internet access, GPS permission, or third-party services. Hotline access may remain available offline.
              </Text>
              <Text style={styles.body}>
                <Text style={styles.bold}>3. Third-Party Services: </Text>
                External websites and services are not controlled by the developers.
              </Text>
              <Text style={styles.body}>
                <Text style={styles.bold}>4. Emergency Use: </Text>
                This app does not replace official emergency hotlines. Call the appropriate emergency number directly when urgent assistance is needed.
              </Text>
              <Text style={styles.body}>
                <Text style={styles.bold}>5. Data Privacy: </Text>
                Location and other submitted information may be processed to support app features. Use location sharing only with the required permission.
              </Text>
              <Text style={styles.body}>
                By continuing, you acknowledge that you have read this notice.
              </Text>
              <TouchableOpacity style={styles.button} onPress={handleAgree}>
                <Text style={styles.buttonText}>I agree</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user
            ? <Stack.Screen name="MainApp" component={MainTabs} />
            : <Stack.Screen name="Auth" component={AuthScreen} />}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  overlay: { flex: 1, backgroundColor: '#0009', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 20, width: '90%', maxHeight: '85%', padding: 20, elevation: 10 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: '#003399', textAlign: 'center' },
  body: { fontSize: 13, marginBottom: 12, lineHeight: 18, color: '#444', textAlign: 'justify' },
  bold: { fontWeight: 'bold', color: '#000' },
  button: { backgroundColor: '#003399', alignSelf: 'center', paddingHorizontal: 50, paddingVertical: 12, borderRadius: 25, marginVertical: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
