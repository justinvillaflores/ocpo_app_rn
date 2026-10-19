import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, ActivityIndicator,
  SafeAreaView, StatusBar, TouchableOpacity, Modal, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Megaphone, Calendar, Clock, AlertTriangle, Info, X, ExternalLink } from 'lucide-react-native';

const ANNOUNCEMENTS_CACHE_KEY = '@announcements_cache_key';

export default function AnnounceScreen() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdvisory, setSelectedAdvisory] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCachedAnnouncements = async () => {
      try {
        const cachedData = await AsyncStorage.getItem(ANNOUNCEMENTS_CACHE_KEY);
        if (cachedData !== null && isMounted) {
          const parsedData = JSON.parse(cachedData);
          if (parsedData.length > 0) {
            setAnnouncements(parsedData);
            setLoading(false);
            console.log("Successfully loaded cached announcements:", parsedData.length);
          }
        }
      } catch (error) {
        console.error("Error loading cached announcements:", error);
      }
    };

    loadCachedAnnouncements();

    const colRef = collection(db, "announcements");
    const q = query(colRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, async (snapshot) => {
      if (!isMounted) return;

      const fromCache = snapshot.metadata.fromCache;
      setIsOffline(fromCache);

      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (list.length > 0) {
        setAnnouncements(list);

        if (!fromCache) {
          try {
            await AsyncStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(list));
            console.log("Updated announcements local cache with latest server data.");
          } catch (error) {
            console.error("Error saving announcements to local cache:", error);
          }
        }
      }

      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const renderItem = ({ item }) => {
    const badgeType = item.type || item.category || "General";
    const isEmergency = badgeType === 'Emergency';
    const isImportant = badgeType === 'Important';

    return (
      <View style={styles.card}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Megaphone size={40} color="#CBD5E1" />
          </View>
        )}

        <View style={[styles.badge, isEmergency ? styles.badgeEmergency : (isImportant ? styles.badgeImportant : styles.badgeGeneral)]}>
          {isEmergency ? <AlertTriangle size={12} color="white" /> : <Info size={12} color="white" />}
          <Text style={styles.badgeText}>{badgeType}</Text>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title || item.headline}</Text>
          <Text style={styles.cardDetail} numberOfLines={3}>{item.content || item.messageDetail}</Text>

          <View style={styles.cardFooter}>
            <View style={styles.footerLeft}>
              <View style={styles.footerItem}>
                <Calendar size={13} color="#3B82F6" />
                <Text style={styles.footerText}>{item.date || "Today"}</Text>
              </View>
              <View style={styles.footerItem}>
                <Clock size={13} color="#3B82F6" />
                <Text style={styles.footerText}>{item.time || "Recent"}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.viewButton} activeOpacity={0.7} onPress={() => setSelectedAdvisory(item)}>
              <Text style={styles.viewButtonText}>View</Text>
              <ExternalLink size={12} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d6efd" />
        <Text style={styles.loadingText}>Loading Advisories...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Official Advisories</Text>
        <Text style={styles.headerSubtitle}>Verified updates from the Command Center</Text>
      </View>

      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>OFFLINE MODE - CACHED ADVISORIES</Text>
        </View>
      )}

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Megaphone size={60} color="#E2E8F0" />
            <Text style={styles.emptyText}>No active advisories found.</Text>
          </View>
        }
      />

      <Modal visible={selectedAdvisory !== null} animationType="slide" transparent={true} onRequestClose={() => setSelectedAdvisory(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalBadgeContainer}>
                <Text style={styles.modalBadgeText}>{selectedAdvisory?.type || selectedAdvisory?.category || "General"}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedAdvisory(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {selectedAdvisory?.imageUrl ? <Image source={{ uri: selectedAdvisory.imageUrl }} style={styles.modalImage} /> : null}
              <Text style={styles.modalTitle}>{selectedAdvisory?.title || selectedAdvisory?.headline}</Text>

              <View style={styles.modalMetaRow}>
                <View style={styles.footerItem}>
                  <Calendar size={14} color="#3B82F6" />
                  <Text style={styles.modalMetaText}>{selectedAdvisory?.date || "Today"}</Text>
                </View>
                <View style={styles.footerItem}>
                  <Clock size={14} color="#3B82F6" />
                  <Text style={styles.modalMetaText}>{selectedAdvisory?.time || "Recent"}</Text>
                </View>
              </View>

              <Text style={styles.modalContent}>{selectedAdvisory?.content || selectedAdvisory?.messageDetail}</Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedAdvisory(null)}>
                <Text style={styles.modalCloseBtnText}>Close Advisory</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Compact StyleSheet
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748B', fontSize: 14 },
  header: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
  offlineBanner: { backgroundColor: '#6C757D', paddingVertical: 6, paddingHorizontal: 12, marginHorizontal: 15, marginTop: 10, borderRadius: 6, alignItems: 'center' },
  offlineBannerText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  listContainer: { padding: 15, paddingBottom: 30 },
  card: { backgroundColor: 'white', borderRadius: 20, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardImage: { width: '100%', height: 180, backgroundColor: '#F1F5F9' },
  placeholderImage: { width: '100%', height: 180, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 15, left: 15, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeEmergency: { backgroundColor: '#EF4444' },
  badgeImportant: { backgroundColor: '#F59E0B' },
  badgeGeneral: { backgroundColor: '#3B82F6' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  cardContent: { padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  cardDetail: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  viewButtonText: { fontSize: 12, fontWeight: '700', color: '#3B82F6' },
  emptyContainer: { marginTop: 100, alignItems: 'center' },
  emptyText: { marginTop: 10, color: '#94A3B8', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalBadgeContainer: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modalBadgeText: { color: '#3B82F6', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  closeButton: { padding: 6, backgroundColor: '#F8FAFC', borderRadius: 20 },
  modalBody: { paddingHorizontal: 20, paddingTop: 16 },
  modalImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 12, lineHeight: 26 },
  modalMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingBottom: 16, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalMetaText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  modalContent: { fontSize: 15, color: '#334155', lineHeight: 24, marginBottom: 20 },
  modalFooter: { paddingHorizontal: 20, paddingTop: 10 },
  modalCloseBtn: { backgroundColor: '#1E293B', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalCloseBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
});