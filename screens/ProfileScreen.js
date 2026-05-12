import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      }
    } catch (error) {
      console.log("Error fetching user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Kapag nag-logout, babalik sa AuthScreen dahil sa onAuthStateChanged logic natin
    } catch (error) {
      console.log("Logout Error:", error);
    }
  };

  if (loading) return <ActivityIndicator style={{flex:1}} size="large" color="#0047AB" />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={styles.profileCard}>
        <Ionicons name="person-circle" size={80} color="#0047AB" />
        <Text style={styles.userName}>{userData?.username || "Guest User"}</Text>

        <View style={styles.infoList}>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{userData?.phoneNumber || "No number"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{userData?.address || "No address"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{userData?.email || auth.currentUser?.email}</Text>
          </View>
        </View>
      </View>

      <View style={styles.qrCard}>
        <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Scan to Download the App</Text>
        <QRCode value="https://bit.ly/4fjvsoe" size={150} color="#000" />
      </View>

      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.item}><Text>Help</Text><Ionicons name="chevron-forward" size={20} color="#666" /></TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={handleLogout}>
          <Text style={{color: 'red'}}>Logout</Text>
          <Ionicons name="chevron-forward" size={20} color="red" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: { backgroundColor: '#fff', margin: 15, borderRadius: 15, padding: 20, alignItems: 'center' },
  userName: { fontSize: 20, fontWeight: 'bold', marginTop: 10, color: '#333' },
  infoList: { marginTop: 15, width: '100%' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  infoText: { fontSize: 14, color: '#555', marginLeft: 10 },
  qrCard: { backgroundColor: '#fff', marginHorizontal: 15, borderRadius: 15, padding: 20, alignItems: 'center' },
  menuCard: { backgroundColor: '#fff', margin: 15, borderRadius: 15, paddingVertical: 10 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
});