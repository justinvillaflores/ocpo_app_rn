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
      await Share.share({
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#0047AB" />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topSection}>
        {/* Profile Details Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={90} color="#0047AB" />
          </View>
          <Text style={styles.userName}>{userData?.username || "Guest User"}</Text>
          <Text style={styles.userRole}>Citizen Account</Text>

          <View style={styles.divider} />

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="call-outline" size={18} color="#0047AB" />
              </View>
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>Contact Number</Text>
                <Text style={styles.infoText}>{userData?.phoneNumber || "No contact number provided"}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="location-outline" size={18} color="#0047AB" />
              </View>
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoText}>{userData?.address || "No address provided"}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="mail-outline" size={18} color="#0047AB" />
              </View>
              <View style={styles.infoTextGroup}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoText}>{userData?.email || auth.currentUser?.email || "No email provided"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Share Section Banner */}
        <TouchableOpacity style={styles.shareCard} onPress={onShare} activeOpacity={0.8}>
          <View style={styles.shareIconContainer}>
            <Ionicons name="share-social" size={24} color="#0047AB" />
          </View>
          <View style={styles.shareTextContainer}>
            <Text style={styles.shareTitle}>Share OneCall App</Text>
            <Text style={styles.shareSubTitle}>Help others stay prepared for emergencies.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#bbb" />
        </TouchableOpacity>

        {/* Action Menu */}
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.item} activeOpacity={0.7}>
            <View style={styles.itemLabel}>
              <Ionicons name="help-circle-outline" size={22} color="#555" style={{ marginRight: 12 }} />
              <Text style={styles.itemText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.item, { borderBottomWidth: 0 }]} onPress={() => setShowLogoutModal(true)} activeOpacity={0.7}>
            <View style={styles.itemLabel}>
              <Ionicons name="log-out-outline" size={22} color="#D32F2F" style={{ marginRight: 12 }} />
              <Text style={[styles.itemText, { color: '#D32F2F', fontWeight: 'bold' }]}>Logout</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Branding */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>OneCall Emergency System v1.0.0</Text>
        <Text style={styles.footerSubText}>Olongapo City Emergency Response</Text>
      </View>

      {/* Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="alert-circle" size={54} color="#0047AB" />
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
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  contentContainer: {
    flexGrow: 1,
    justify: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 80,
    paddingBottom: 25,
  },
  topSection: {
    width: '100%',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  avatarContainer: {
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  userRole: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 16,
  },
  infoList: {
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginTop: 1,
  },
  shareCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  shareIconContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 14,
    marginRight: 14,
  },
  shareTextContainer: {
    flex: 1,
  },
  shareTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  shareSubTitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 4,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '600',
  },
  footerSubText: {
    fontSize: 11,
    color: '#CCC',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#1A1A1A',
  },
  modalSubTitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelBtn: {
    backgroundColor: '#F0F2F5',
  },
  cancelBtnText: {
    color: '#444',
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: '#D32F2F',
  },
  logoutBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});