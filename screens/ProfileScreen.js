import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Share,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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

  const onShare = async () => {
    try {
      const result = await Share.share({
        message: 'Download OneCall: Olongapo City Emergency Hotlines App soon!',
      });
    } catch (error) {
      console.log("Share Error:", error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowLogoutModal(false);
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
            <Text style={styles.infoText}>{userData?.phoneNumber || "No contact number provided"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{userData?.address || "No address provided"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{userData?.email || auth.currentUser?.email}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.shareCard} onPress={onShare}>
        <View style={styles.shareIconContainer}>
          <Ionicons name="share-social" size={24} color="#0047AB" />
        </View>
        <View style={styles.shareTextContainer}>
          <Text style={styles.shareTitle}>Share OneCall App</Text>
          <Text style={styles.shareSubTitle}>Help others stay prepared for emergencies.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLabel}>
             <Ionicons name="help-circle-outline" size={20} color="#666" style={{marginRight: 10}} />
             <Text>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={() => setShowLogoutModal(true)}>
          <View style={styles.itemLabel}>
             <Ionicons name="log-out-outline" size={20} color="red" style={{marginRight: 10}} />
             <Text style={{color: 'red'}}>Logout</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="red" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="alert-circle" size={50} color="#0047AB" />
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalSubTitle}>Are you sure you want to log out of your account?</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.logoutBtn]}
                onPress={handleLogout}
              >
                <Text style={styles.logoutBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: { backgroundColor: '#fff', margin: 15, borderRadius: 15, padding: 20, alignItems: 'center' },
  userName: { fontSize: 20, fontWeight: 'bold', marginTop: 10, color: '#333' },
  infoList: { marginTop: 15, width: '100%' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  infoText: { fontSize: 14, color: '#555', marginLeft: 10 },
  shareCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5
  },
  shareIconContainer: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 12,
    marginRight: 15
  },
  shareTextContainer: { flex: 1 },
  shareTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  shareSubTitle: { fontSize: 12, color: '#888', marginTop: 2 },
  menuCard: { backgroundColor: '#fff', margin: 15, borderRadius: 15, paddingVertical: 5 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemLabel: { flexDirection: 'row', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '80%', borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10, color: '#333' },
  modalSubTitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 10, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  cancelBtn: { backgroundColor: '#f0f0f0' },
  cancelBtnText: { color: '#333', fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#0047AB' },
  logoutBtnText: { color: '#fff', fontWeight: 'bold' },
});