import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';

import { auth, db } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Directory" component={DirectoryScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Announce" component={AnnounceScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [showNotice, setShowNotice] = useState(false);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const startup = async () => {
      try {
        // 1. Check persistence for Notice
        const hasAgreed = await AsyncStorage.getItem('hasAgreedToNotice');
        if (hasAgreed !== 'true') {
          setShowNotice(true);
        }

        // 2. Auth State Listener
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setInitializing(false);

          if (currentUser) {
            startLocationTracking(currentUser.uid);
          }
        });

        return unsubscribe;
      } catch (e) {
        console.log("Startup Error: ", e);
        setInitializing(false);
      }
    };

    startup();
  }, []);

  const startLocationTracking = async (uid) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 10,
        },
        async (location) => {
          const { latitude, longitude } = location.coords;
          let reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
          const place = reverse[0];

          const userRef = doc(db, "users", uid);
          await updateDoc(userRef, {
            lastKnownLat: latitude,
            lastKnownLon: longitude,
            lastKnownStreet: place?.street || "Unknown Street",
            lastKnownBarangay: place?.district || place?.subregion || "Unknown Brgy",
            lastLocationUpdate: serverTimestamp(),
            isOnline: true
          });
        }
      );
    } catch (err) {
      console.log("Location Error: ", err);
    }
  };

  const handleAgree = async () => {
    await AsyncStorage.setItem('hasAgreedToNotice', 'true');
    setShowNotice(false);
  };

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003399" />
      </View>
    );
  }

  return (
    <>
      <Modal visible={showNotice} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Notice to the Public</Text>
              <Text style={styles.modalText}>
                Welcome to the <Text style={styles.bold}>Olongapo City Hotlines</Text> mobile application.
                Before you proceed, please read and understand the following disclaimer:
              </Text>
              <Text style={styles.modalText}>
                <Text style={styles.bold}>Developed with purpose. Built for public safety.</Text>{'\n'}
                A collaboration between Computer Science students from Gordon College and the Olongapo City Police Office — serving the community through technology.
              </Text>
              <Text style={styles.modalText}>
                1. <Text style={styles.bold}>General Information:</Text> The Olongapo City Hotlines mobile application is developed to provide fast and convenient access to key emergency contact numbers and essential public service hotlines in Olongapo City. The information in this app is intended for general guidance only. While we strive to keep all information accurate and up to date, we do not guarantee its completeness or real-time reliability.
              </Text>
              <Text style={styles.modalText}>
                2. <Text style={styles.bold}>Service Limitations:</Text> Some services and features within the app may be limited due to external factors such as internet connection, device performance, or third-party services. While most features are accessible offline, certain components (like feedback or future updates) may require internet access and may be subject to change without prior notice.
              </Text>
              <Text style={styles.modalText}>
                3. <Text style={styles.bold}>Third-Party Content and Websites:</Text> This app may contain links or references to external websites and services not controlled by the developers or the Olongapo City Police Office. We do not take responsibility for the content, policies, or accuracy of any third-party services. Users should review their terms and privacy policies independently.
              </Text>
              <Text style={styles.modalText}>
                4. <Text style={styles.bold}>Personal Safety and Emergency Use:</Text> The Olongapo City Hotlines app is not a replacement for official emergency hotlines. In case of urgent or life-threatening situations, always call emergency numbers directly. The app is designed as a support tool, and we are not liable for actions or decisions made solely based on the app’s content.
              </Text>
              <Text style={styles.modalText}>
                5. <Text style={styles.bold}>Data Privacy:</Text> Your privacy is important. Any data voluntarily submitted through the app (e.g., feedback or suggestions) is handled in accordance with applicable privacy laws and solely for improving public service and system quality.
              </Text>
              <Text style={styles.acceptText}>
                By using the Olongapo City Hotlines mobile application, you acknowledge that you have read and understood this disclaimer. If you do not agree with any part of this notice, please refrain from using the app. Your continued use implies acceptance of the terms stated herein.
              </Text>
              <TouchableOpacity style={styles.agreeButton} onPress={handleAgree}>
                <Text style={styles.agreeText}>I agree</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Stack.Screen name="MainApp" component={MainTabs} />
          ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: 'white', borderRadius: 20, width: '90%', maxHeight: '85%', padding: 20, elevation: 10 },
  modalContent: { flexGrow: 1 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: '#003399', textAlign: 'center' },
  modalText: { fontSize: 13, marginBottom: 12, lineHeight: 18, color: '#444', textAlign: 'justify' },
  acceptText: { fontSize: 12, marginTop: 5, marginBottom: 15, color: '#666', fontStyle: 'italic', textAlign: 'center' },
  bold: { fontWeight: 'bold', color: '#000' },
  agreeButton: { backgroundColor: '#003399', alignSelf: 'center', paddingHorizontal: 50, paddingVertical: 12, borderRadius: 25, marginTop: 5, marginBottom: 10 },
  agreeText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});