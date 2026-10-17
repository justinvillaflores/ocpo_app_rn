
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  StyleSheet, Image, Linking, TextInput, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { db } from '../firebaseConfig';
import {
  collection, onSnapshot, query, orderBy,
  addDoc, serverTimestamp,
} from 'firebase/firestore';

const CACHE_KEY = '@services_hotlines_cache';
const QUEUE_KEY = '@offline_feedback_queue';

const SmartImage = ({ uri, defaultSource, style }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  return !uri || failed
    ? <Image source={defaultSource} style={style} />
    : <Image source={{ uri }} style={style}
        onError={() => setFailed(true)} />;
};

export default function ServicesScreen() {
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const savedRef = useRef(null);
  const syncingRef = useRef(false);

  // Best-effort cache: hindi hahadlang sa screen kapag puno ang storage.
  const saveCache = async (data) => {
    try {
      const json = JSON.stringify(data);
      if (json === savedRef.current) return;
      await AsyncStorage.setItem(CACHE_KEY, json);
      savedRef.current = json;
    } catch (e) {
      console.warn('Services cache unavailable:', e?.message);
    }
  };

  const syncFeedback = async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (!stored) return;

      const queue = JSON.parse(stored);
      if (!Array.isArray(queue)) return;

      while (queue.length) {
        const item = queue[0];
        await addDoc(collection(db, 'feedback'), {
          rating: item.rating,
          comment: item.comment,
          createdAt: serverTimestamp(),
          syncedFromOffline: true,
        });

        queue.shift();
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      }

      await AsyncStorage.removeItem(QUEUE_KEY);
    } catch (e) {
      console.warn('Feedback sync failed:', e?.message);
    } finally {
      syncingRef.current = false;
    }
  };

  useEffect(() => {
    let active = true;

    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (!active || !cached) return;

        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          savedRef.current = cached;
          setAllData(parsed);
        }
      } catch (e) {
        console.warn('Cache read failed:', e?.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCache();

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        syncFeedback();
      }
    });

    const q = query(collection(db, 'hotlines'), orderBy('name', 'asc'));
    const unsubscribeData = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active) return;

        setIsOffline(snapshot.metadata.fromCache);
        const data = snapshot.docs.map((d) => ({
          id: d.id, ...d.data(),
        }));

        // Empty server results are valid; huwag mag-iwan ng lumang data.
        setAllData(data);
        if (!snapshot.metadata.fromCache) saveCache(data);
        setLoading(false);
      },
      (e) => {
        console.warn('Firebase services error:', e?.message);
        if (active) setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribeNet();
      unsubscribeData();
    };
  }, []);

  // Normalize category values for reliable filtering.
  const categoryOf = (item) =>
    String(item.category || '').trim().toLowerCase();

  // Categories na para lamang sa Services screen.
  const sections = [
    {
      title: 'Report',
      items: allData.filter(
        (item) => categoryOf(item) === 'report'
      ),
    },
    {
      title: 'Services',
      items: allData.filter(
        (item) => categoryOf(item) === 'services'
      ),
    },
    {
      title: 'Other Pages',
      items: allData.filter(
        (item) => categoryOf(item) === 'other pages'
      ),
    },
    {
      title: 'Pages',
      items: allData.filter(
        (item) => {
          const category = categoryOf(item);
          return category === 'page' || category === 'pages';
        }
      ),
    },
    {
      title: 'CCTV Stream',
      items: allData.filter(
        (item) => {
          const category = categoryOf(item);

          // Support both new and old saved CCTV category values.
          return (
            category === 'cctv stream' ||
            category.includes('cctv')
          );
        }
      ),
    },
  ];

  const badWords = [
    'putangina', 'puta', 'gago', 'tanga', 'bobo', 'ulol',
    'leche', 'pakyu', 'siraulo', 'bwisit', 'bugok', 'yawa',
    'nigger', 'put4ngina', 't4ngina', 'b0b0', '8080',
  ];

  const hasBadWords = (value) => {
    const normalized = value.toLowerCase()
      .replace(/4/g, 'a').replace(/@/g, 'a')
      .replace(/0/g, 'o').replace(/1/g, 'l')
      .replace(/3/g, 'e').replace(/\*/g, '')
      .replace(/\s/g, '');

    return badWords.some((word) =>
      normalized.includes(word.replace(/\s/g, ''))
    );
  };

  const submitFeedback = async () => {
    const score = Number(rating);
    if (!Number.isInteger(score) || score < 1 || score > 5)
      return alert('Please enter a rating from 1 to 5.');
    if (!comment.trim())
      return alert('Please enter your suggestion.');
    if (hasBadWords(comment)) {
      setWarningVisible(true);
      return;
    }

    const item = { rating: score, comment: comment.trim() };

    try {
      const state = await NetInfo.fetch();
      const online = state.isConnected &&
        state.isInternetReachable !== false;

      if (online) {
        await addDoc(collection(db, 'feedback'), {
          ...item, createdAt: serverTimestamp(),
        });
        alert('Thank you for your feedback!');
      } else {
        const stored = await AsyncStorage.getItem(QUEUE_KEY);
        const queue = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(queue)) throw new Error('Invalid queue');
        queue.push({ ...item, timestamp: new Date().toISOString() });
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        alert('Offline: feedback saved for later submission.');
      }

      setRating('');
      setComment('');
      setModalVisible(false);
    } catch (e) {
      console.warn('Feedback submission failed:', e?.message);
      alert('Unable to submit or save feedback. Check device storage and connection.');
    }
  };

  const openItem = async (item) => {
    const target = String(item.number || item.url || '').trim();
    if (!target) return alert('No link or number is available.');

    const url = /^https?:\/\//i.test(target) ? target
      : /^[+\d][\d\s()-]*$/.test(target)
        ? `tel:${target.replace(/[^\d+]/g, '')}` : target;

    try {
      await Linking.openURL(url);
    } catch (e) {
      console.warn('Unable to open item:', e?.message);
      alert('Unable to open this link on your device.');
    }
  };

  const renderGrid = (items, columns = 3) => {
    const rows = [];
    for (let i = 0; i < items.length; i += columns) {
      const row = items.slice(i, i + columns);
      while (row.length < columns) row.push(null);
      rows.push(row);
    }

    return rows.map((row, r) => (
      <View key={`row-${r}`} style={styles.gridRow}>
        {row.map((item, i) => {
          if (!item) return <View key={`empty-${i}`} style={styles.gridItem} />;
          const cctv = categoryOf(item).includes('cctv');

          return (
            <TouchableOpacity key={item.id || `${r}-${i}`}
              onPress={() => openItem(item)} style={styles.gridItem}>
              <SmartImage uri={item.imageUrl}
                defaultSource={require('../assets/pnp.png')}
                style={[styles.image, cctv && styles.cctvImage]} />
              <Text style={[styles.itemName, cctv && styles.cctvName]}>
                {item.name || 'Service'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ));
  };

  if (loading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#0047AB" />
      <Text style={styles.loadingText}>Loading Services...</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isOffline && <View style={styles.offline}>
        <Text style={styles.offlineText}>OFFLINE MODE - CACHED DATA</Text>
      </View>}

      <View style={styles.banner}>ot
        <Image source={require('../assets/ocposervices.png')}
          style={styles.bannerImage} />
      </View>

      {sections.map((section) => section.items.length > 0 && (
        <View key={section.title}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {renderGrid(section.items)}
        </View>
      ))}

      <TouchableOpacity onPress={() => setModalVisible(true)}
        style={styles.feedbackBtn}>
        <Text style={styles.feedbackBtnText}>Give Feedback</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Submit Feedback</Text>
              <Text>Rate the App (1 to 5):</Text>
              <TextInput value={rating} onChangeText={setRating}
                keyboardType="numeric" style={styles.input} placeholder="e.g. 5" />
              <Text style={styles.suggestion}>Your Suggestion:</Text>
              <TextInput value={comment} onChangeText={setComment}
                multiline style={[styles.input, styles.comment]}
                placeholder="Tell us what you think..." />

              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={() => setModalVisible(false)}
                  style={[styles.button, styles.cancel]}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={submitFeedback}
                  style={[styles.button, styles.submit]}>
                  <Text style={styles.buttonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={warningVisible} transparent animationType="fade"
        onRequestClose={() => setWarningVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>Inappropriate Language Detected!</Text>
            <Text style={styles.warningMessage}>
              Please remove inappropriate words from your feedback.
            </Text>
            <TouchableOpacity onPress={() => setWarningVisible(false)}
              style={[styles.button, styles.dismiss]}>
              <Text style={styles.buttonText}>Dismiss Warning</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: '#fff' },
  content: { paddingTop: 5, paddingBottom: 100 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10 },
  offline: { backgroundColor: '#6c757d', padding: 5, borderRadius: 5, marginTop: 10 },
  offlineText: { color: '#fff', textAlign: 'center', fontSize: 10, fontWeight: 'bold' },
  banner: { width: '100%', height: 180, overflow: 'hidden', borderRadius: 10, marginBottom: 5 },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginVertical: 20 },
  gridRow: { flexDirection: 'row', marginBottom: 15 },
  gridItem: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  image: { width: 70, height: 70, marginBottom: 5, borderWidth: 1, borderColor: '#000', borderRadius: 10, backgroundColor: '#f9f9f9' },
  cctvImage: { width: 150, height: 150, borderRadius: 15 },
  itemName: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  cctvName: { fontSize: 14, width: 150 },
  feedbackBtn: { backgroundColor: '#0d6efd', paddingVertical: 12, borderRadius: 8, marginTop: 80, marginBottom: 20, alignItems: 'center' },
  feedbackBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 15, width: '90%', maxHeight: '80%' },
  modalContent: { padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  suggestion: { fontSize: 14, marginTop: 15 },
  input: { borderColor: '#ddd', borderWidth: 1, padding: 10, marginTop: 10, borderRadius: 6, color: '#222' },
  comment: { height: 100, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, gap: 10 },
  button: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancel: { backgroundColor: 'gray' },
  submit: { backgroundColor: '#0d6efd' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  warning: { backgroundColor: '#fff', borderRadius: 15, width: '90%', padding: 20, alignItems: 'center' },
  warningTitle: { fontSize: 18, fontWeight: 'bold', color: 'red', marginBottom: 10, textAlign: 'center' },
  warningMessage: { fontSize: 14, textAlign: 'center', marginBottom: 15 },
  dismiss: { backgroundColor: '#dc3545' },
});
