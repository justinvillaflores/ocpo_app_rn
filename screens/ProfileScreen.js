import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Share, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';

const cacheKey = uid => `onecall_profile_${uid}`;
const normalize = (d = {}, email = '') => ({
  ...d,
  username: d.username || d.fullName || d.fullname || d.name || '',
  phoneNumber: d.phoneNumber || d.contactNumber || d.phone || '',
  address: d.address || '',
  email: d.email || email || '',
});

const helpSteps = [
  ['warning-outline', '1. Tap Emergency Type', 'Select Medical, Fire, Police, or Rescue from the Home Screen.'],
  ['location-outline', '2. Confirm Your Location', 'Make sure GPS is enabled so responders can identify your location.'],
  ['call-outline', '3. Direct Hotline Call', 'Use the direct dial buttons to contact emergency services.'],
];

export default function ProfileScreen() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProfile = async user => {
      if (!user) {
        if (active) {
          setUserData(null);
          setLoading(false);
        }
        return;
      }

      const key = cacheKey(user.uid);
      let cached = {};

      try {
        const saved = await AsyncStorage.getItem(key);
        if (saved) {
          cached = JSON.parse(saved);
          if (active) {
            setUserData(normalize(cached, user.email));
            setLoading(false);
          }
        }
      } catch (e) {
        console.log('Cache error:', e);
      }

      try {
        const snap = await getDoc(doc(db, 'users', user.uid));

        if (snap.exists()) {
          const remote = normalize(snap.data(), user.email);
          const updated = normalize({
            ...cached,
            ...remote,
            username: remote.username || cached.username,
            phoneNumber: remote.phoneNumber || cached.phoneNumber,
            address: remote.address || cached.address,
            email: remote.email || cached.email,
          }, user.email);

          await AsyncStorage.setItem(key, JSON.stringify(updated));
          if (active) setUserData(updated);
        } else if (!cached.username && !cached.phoneNumber && !cached.address) {
          if (active) setUserData(normalize({}, user.email));
        }
      } catch (e) {
        console.log('Offline mode: using saved profile.', e);
        if (active && Object.keys(cached).length) {
          setUserData(normalize(cached, user.email));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, loadProfile);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      setShowLogoutModal(false);
    } catch (e) {
      console.log('Logout error:', e);
    }
  };

  const shareApp = () => Share.share({
    message: 'Download OneCall: Olongapo City Emergency Hotlines App soon!',
  });

  const name = userData?.username || 'Guest User';
  const phone = userData?.phoneNumber || 'No contact number provided';
  const address = userData?.address || 'No address provided';
  const email = userData?.email || auth.currentUser?.email || 'No email provided';

  const info = [
    ['call-outline', 'Contact Number', phone],
    ['location-outline', 'Address', address],
    ['mail-outline', 'Email Address', email],
  ];

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.iconBox}><Ionicons name={icon} size={18} color="#0047AB" /></View>
      <View style={styles.flex}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoText}>{value}</Text>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#0047AB" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View>
        <View style={styles.profileCard}>
          <Ionicons name="person-circle" size={90} color="#0047AB" />
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userRole}>Citizen Account</Text>
          <View style={styles.divider} />
          {info.map(([icon, label, value]) => (
            <InfoRow key={label} icon={icon} label={label} value={value} />
          ))}
        </View>

        <TouchableOpacity style={styles.shareCard} onPress={shareApp}>
          <View style={styles.shareIcon}>
            <Ionicons name="share-social" size={24} color="#0047AB" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.shareTitle}>Share OneCall App</Text>
            <Text style={styles.subText}>Help others stay prepared for emergencies.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#bbb" />
        </TouchableOpacity>

        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowHelpModal(true)}>
            <Text style={styles.menuText}>ⓘ   Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowLogoutModal(true)}>
            <Text style={[styles.menuText, { color: '#D32F2F' }]}>⇥   Logout</Text>
            <Ionicons name="chevron-forward" size={20} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>OneCall Emergency System v1.0.0</Text>
        <Text style={styles.footerSub}>Olongapo City Emergency Response</Text>
      </View>

      <Modal visible={showHelpModal} transparent animationType="slide" onRequestClose={() => setShowHelpModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.helpModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Help & Support Center</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.sectionTitle}>Emergency Reporting Guide</Text>
              {helpSteps.map(([icon, title, desc]) => (
                <View style={styles.guideStep} key={title}>
                  <Ionicons name={icon} size={20} color="#0047AB" />
                  <View style={styles.flex}>
                    <Text style={styles.guideTitle}>{title}</Text>
                    <Text style={styles.guideDesc}>{desc}</Text>
                  </View>
                </View>
              ))}
              <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
              <View style={styles.faqCard}>
                <Text style={styles.guideTitle}>Is OneCall available 24/7?</Text>
                <Text style={styles.guideDesc}>Emergency hotlines may be available 24 hours a day, depending on the service.</Text>
              </View>
              <View style={styles.faqCard}>
                <Text style={styles.guideTitle}>Can I use this without internet?</Text>
                <Text style={styles.guideDesc}>Saved profile information and hotline details may be viewed offline. Internet is needed for online updates and real-time features.</Text>
              </View>
              <Text style={styles.sectionTitle}>Command Center Contact</Text>
              <Text style={styles.contactText}>For system concerns or updates, contact the appropriate local emergency office.</Text>
            </ScrollView>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowHelpModal(false)}>
              <Text style={styles.primaryBtnText}>Close Help Center</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.logoutModal}>
            <Ionicons name="alert-circle" size={54} color="#0047AB" />
            <Text style={styles.modalHeading}>Confirm Logout</Text>
            <Text style={styles.logoutSub}>Are you sure you want to log out of your account?</Text>
            <View style={styles.buttons}>
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.logoutBtn]} onPress={logout}>
                <Text style={styles.primaryBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F6F9' },
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  content: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 80, paddingBottom: 25 },
  profileCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 10, elevation: 2 },
  userName: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
  userRole: { fontSize: 13, color: '#666', marginTop: 2, fontWeight: '500' },
  divider: { width: '100%', height: 1, backgroundColor: '#F0F0F0', marginVertical: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, width: '100%' },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoLabel: { fontSize: 11, color: '#888', fontWeight: '600', textTransform: 'uppercase' },
  infoText: { fontSize: 14, color: '#333', fontWeight: '500', marginTop: 1 },
  shareCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16, elevation: 2 },
  shareIcon: { backgroundColor: '#E3F2FD', padding: 12, borderRadius: 14, marginRight: 14 },
  shareTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  subText: { fontSize: 12, color: '#777', marginTop: 2 },
  menuCard: { backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 18, elevation: 2 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuText: { fontSize: 15, color: '#444', fontWeight: '600' },
  footer: { alignItems: 'center', paddingVertical: 12 },
  footerText: { fontSize: 12, color: '#AAA', fontWeight: '600' },
  footerSub: { fontSize: 11, color: '#CCC', marginTop: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  helpModal: { backgroundColor: '#fff', width: '90%', maxHeight: '80%', borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 12, marginBottom: 12 },
  modalHeading: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0047AB', marginVertical: 10 },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 8 },
  guideTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  guideDesc: { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 17 },
  faqCard: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 8 },
  contactText: { backgroundColor: '#E3F2FD', padding: 12, borderRadius: 12, color: '#0047AB', fontSize: 12, lineHeight: 17 },
  primaryBtn: { backgroundColor: '#0047AB', paddingVertical: 13, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  logoutModal: { backgroundColor: '#fff', width: '85%', borderRadius: 22, padding: 24, alignItems: 'center' },
  logoutSub: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 },
  buttons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginHorizontal: 5 },
  cancelBtn: { backgroundColor: '#F0F2F5' },
  cancelText: { color: '#444', fontWeight: '700' },
  logoutBtn: { backgroundColor: '#D32F2F' },
});