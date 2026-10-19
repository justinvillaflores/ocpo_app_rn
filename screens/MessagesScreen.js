
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  TextInput, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, StatusBar, Alert, Modal
} from 'react-native';
import {
  Search, Shield, Send, Camera, ChevronLeft,
  Building2, WifiOff, MessageSquare
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SMS from 'expo-sms';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../firebaseConfig';
import {
  collection, query, where, onSnapshot, orderBy,
  addDoc, serverTimestamp, doc, setDoc, getDoc, limit
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const CACHE_KEY = '@responders_cache_key';

const INCIDENT_TYPES = [
  { id: 'crime', label: 'Crime / Robbery', description: 'Theft, robbery, or other crime' },
  { id: 'drugs', label: 'Drug-related Incident', description: 'Suspected illegal drug activity' },
  { id: 'fire', label: 'Fire / Smoke', description: 'Fire or smoke hazard' },
  { id: 'medical', label: 'Medical Emergency', description: 'Injury or urgent medical help' },
  { id: 'road_accident', label: 'Road / Traffic Accident', description: 'Vehicle collision or road emergency' },
  { id: 'violence', label: 'Violence / Threat', description: 'Threats, abuse, or immediate danger' },
  { id: 'missing_person', label: 'Missing Person', description: 'Missing or lost person' },
  { id: 'disaster', label: 'Flood / Disaster', description: 'Flood, typhoon, or disaster' },
  { id: 'suspicious_activity', label: 'Suspicious Activity', description: 'Suspicious person, item, or activity' },
  { id: 'public_disturbance', label: 'Public Disturbance', description: 'Fighting, noise, or public disorder' },
  { id: 'rescue', label: 'Rescue / Trapped Person', description: 'Person needing immediate rescue' },
  { id: 'other', label: 'Other Emergency', description: 'An emergency not listed above' }
];

export default function MessagesScreen() {
  const [inChat, setInChat] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [pendingResponder, setPendingResponder] = useState(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedIncidentType, setSelectedIncidentType] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [responders, setResponders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState('Citizen');
  const [user, setUser] = useState(null);

  const flatListRef = useRef(null);

  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, authenticatedUser => {
      setUser(authenticatedUser);
      if (!authenticatedUser) setLoading(false);
    });

    return () => {
      unsubscribeNet();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    getDoc(doc(db, 'users', user.uid))
      .then(snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setCurrentUserName(data.username || data.name || 'Citizen');
        }
      })
      .catch(error => console.log('Profile error:', error));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached && mounted) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length) {
            setResponders(parsed);
            setLoading(false);
          }
        }
      } catch (error) {
        console.log('Responder cache error:', error);
      }
    };

    loadCache();

    const q = query(
      collection(db, 'users'),
      where('role', '==', 'responder')
    );

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      async snapshot => {
        if (!mounted) return;

        setIsOfflineMode(snapshot.metadata.fromCache);

        const list = snapshot.docs.map(item => ({
          id: item.id,
          ...item.data()
        }));

        if (list.length) {
          setResponders(list);

          if (!snapshot.metadata.fromCache) {
            try {
              await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list));
            } catch (error) {
              console.log('Cache save error:', error);
            }
          }
        }

        setLoading(false);
      },
      error => {
        console.error('Responder loading error:', error);
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!inChat || !selectedContact || !user) return;

    const chatId = [user.uid, selectedContact.id].sort().join('_');
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      setMessages(snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      })));
    }, error => console.error('Message loading error:', error));

    return () => unsubscribe();
  }, [inChat, selectedContact, user]);

  const handleSelectResponder = item => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in before starting a chat.');
      return;
    }

    if (!isConnected) {
      Alert.alert('No Internet', 'Reconnect to the internet before starting a chat.');
      return;
    }

    setPendingResponder(item);
    setSelectedIncidentType(null);
    setShowIncidentModal(true);
  };

  const handleContinueToChat = async () => {
    if (!user || !pendingResponder || !selectedIncidentType) {
      Alert.alert('Required', 'Please select an incident type first.');
      return;
    }

    const responder = pendingResponder;
    const incident = selectedIncidentType;
    const chatId = [user.uid, responder.id].sort().join('_');

    try {
      await setDoc(doc(db, 'chats', chatId), {
        participants: [user.uid, responder.id],
        citizenName: currentUserName,
        responderName: responder.name || responder.username || 'Responder',
        incidentType: incident.label,
        incidentTypeId: incident.id,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSelectedContact(responder);
      setPendingResponder(null);
      setShowIncidentModal(false);
      setMessages([]);
      setInChat(true);
    } catch (error) {
      console.error('Incident save error:', error);
      Alert.alert('Unable to Start Chat', 'Could not save incident details. Please try again.');
    }
  };

  const handleCancelIncidentSelection = () => {
    setShowIncidentModal(false);
    setPendingResponder(null);
    setSelectedIncidentType(null);
  };

  const handleSendSMS = async textToSend => {
    const phone = selectedContact?.phoneNumber || selectedContact?.phone;

    if (!phone) {
      Alert.alert('Error', 'No registered number for this responder.');
      return;
    }

    try {
      if (!(await SMS.isAvailableAsync())) {
        Alert.alert('SMS Error', 'SMS is not available on this device.');
        return;
      }

      const body =
        `[OneCall EMERGENCY]\nIncident: ${selectedIncidentType?.label || 'Not specified'}\n` +
        `From: ${currentUserName}\nMessage: ${textToSend}`;

      await SMS.sendSMSAsync([phone], body);
    } catch (error) {
      console.error('SMS error:', error);
      Alert.alert('SMS Error', 'Unable to open the SMS service.');
    }
  };

  // Send text message
  const handleAction = async () => {
    if (!selectedIncidentType) {
      Alert.alert('Required', 'Select an incident type first.');
      return;
    }

    if (!messageText.trim() || !selectedContact || !user || uploading) return;

    if (!isConnected) {
      Alert.alert(
        'Offline',
        'Online messaging is unavailable. Send this message through SMS instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send SMS', onPress: () => handleSendSMS(messageText.trim()) }
        ]
      );
      return;
    }

    const chatId = [user.uid, selectedContact.id].sort().join('_');
    const textToSend = messageText.trim();

    try {
      await setDoc(doc(db, 'chats', chatId), {
        lastMessage: textToSend,
        updatedAt: serverTimestamp(),
        participants: [user.uid, selectedContact.id],
        citizenName: currentUserName,
        responderName: selectedContact.name || selectedContact.username || 'Responder',
        incidentType: selectedIncidentType.label,
        incidentTypeId: selectedIncidentType.id
      }, { merge: true });

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: textToSend,
        senderId: user.uid,
        receiverId: selectedContact.id,
        incidentType: selectedIncidentType.label,
        incidentTypeId: selectedIncidentType.id,
        createdAt: serverTimestamp()
      });

      setMessageText('');
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Message Failed', 'Could not send the message. Please try again.');
    }
  };

  // Open camera
  const handleOpenCamera = async () => {
    if (!selectedIncidentType) {
      Alert.alert('Required', 'Select an incident type before sending a photo.');
      return;
    }

    if (!isConnected) {
      Alert.alert('Offline', 'An internet connection is required to send photos.');
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission Required', 'Allow camera access to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.3
      });

      if (!result.canceled && result.assets?.length) {
        await uploadImageBase64(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Camera Error', 'Unable to open the camera.');
    }
  };

  // Send photo with incident information
  const uploadImageBase64 = async uri => {
    if (!selectedContact || !user || !selectedIncidentType) {
      Alert.alert('Error', 'No active chat or incident type selected.');
      return;
    }

    setUploading(true);

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      const chatId = [user.uid, selectedContact.id].sort().join('_');
      const image = `data:image/jpeg;base64,${base64}`;

      await setDoc(doc(db, 'chats', chatId), {
        lastMessage: '📷 Sent a photo proof',
        updatedAt: serverTimestamp(),
        participants: [user.uid, selectedContact.id],
        citizenName: currentUserName,
        responderName: selectedContact.name || selectedContact.username || 'Responder',
        incidentType: selectedIncidentType.label,
        incidentTypeId: selectedIncidentType.id
      }, { merge: true });

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        image,
        text: '',
        senderId: user.uid,
        receiverId: selectedContact.id,
        incidentType: selectedIncidentType.label,
        incidentTypeId: selectedIncidentType.id,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Photo upload error:', error);
      Alert.alert('Failed', 'Could not send the photo. The image may be too large for Firestore.');
    } finally {
      setUploading(false);
    }
  };

  const filteredResponders = responders.filter(item =>
    (item.name || item.username || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const ResponderLogo = ({ url, size = 45 }) => (
    <View style={[styles.contactIcon, {
      width: size, height: size, borderRadius: size / 4
    }]}>
      {url
        ? <Image source={{ uri: url }} style={styles.avatarImage} />
        : <Building2 size={size * 0.5} color="#94A3B8" />}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Responder list and incident selection
  if (!inChat) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <Modal
          visible={showIncidentModal}
          transparent
          animationType="fade"
          onRequestClose={handleCancelIncidentSelection}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>What type of incident?</Text>
              <Text style={styles.modalSubtitle}>
                Select an incident type before sending messages or photos.
              </Text>

              <FlatList
                data={INCIDENT_TYPES}
                keyExtractor={item => item.id}
                style={styles.incidentList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const selected = selectedIncidentType?.id === item.id;

                  return (
                    <TouchableOpacity
                      onPress={() => setSelectedIncidentType(item)}
                      style={[styles.incidentOption, selected && styles.incidentSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <View style={styles.radioOuter}>
                        {selected && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.incidentName, selected && styles.incidentNameSelected]}>
                          {item.label}
                        </Text>
                        <Text style={styles.incidentDescription}>{item.description}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelIncidentSelection}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.continueBtn, !selectedIncidentType && styles.disabledBtn]}
                  onPress={handleContinueToChat}
                  disabled={!selectedIncidentType}
                >
                  <Text style={styles.continueText}>Continue to chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.iconCircle}>
              <Shield size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Emergency Responders</Text>
              {(isOfflineMode || !isConnected) && (
                <View style={styles.offlineBadge}>
                  <WifiOff size={10} color="#EF4444" />
                  <Text style={styles.offlineText}>OFFLINE MODE</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.searchBar}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              placeholder="Search responder..."
              style={styles.searchInput}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
        </View>

        <FlatList
          data={filteredResponders}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.contactItem} onPress={() => handleSelectResponder(item)}>
              <ResponderLogo url={item.imageUrl} />
              <View>
                <Text style={styles.contactName}>
                  {item.name || item.username || 'Responder'}
                </Text>
                <Text style={styles.contactSub}>
                  {item.phoneNumber || item.phone || 'Local Responder'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No responders available.</Text>
          }
        />
      </SafeAreaView>
    );
  }

  // Chat screen
  return (
    <SafeAreaView style={styles.container}>
      <Modal transparent visible={uploading} animationType="fade">
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.uploadText}>Sending photo...</Text>
            <Text style={styles.uploadSubText}>Please wait a moment</Text>
          </View>
        </View>
      </Modal>

      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => {
          setInChat(false);
          setMessages([]);
        }}>
          <ChevronLeft size={28} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.chatHeaderInfo}>
          <View style={styles.row}>
            <ResponderLogo url={selectedContact?.imageUrl} size={35} />
            <View style={{ flex: 1 }}>
              <Text style={styles.chatTitle}>
                {selectedContact?.name || selectedContact?.username || 'Responder'}
              </Text>
              <Text style={[styles.chatStatus, { color: isConnected ? '#10B981' : '#EF4444' }]}>
                {isConnected ? '● Online' : 'Offline'}
              </Text>
              <Text style={styles.chatIncidentType}>
                Incident: {selectedIncidentType?.label || 'Not selected'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        inverted
        keyExtractor={item => item.id}
        contentContainerStyle={messages.length ? { padding: 15 } : { flexGrow: 1, justifyContent: 'center' }}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <MessageSquare size={38} color="#3B82F6" />
            <Text style={styles.emptyChatTitle}>No conversation yet</Text>
            <Text style={styles.emptyChatSub}>
              Send a message or photo to start chatting with the responder.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={item.senderId === user?.uid ? styles.msgSent : styles.msgReceived}>
            {item.image && (
              <Image source={{ uri: item.image }} style={styles.msgImage} resizeMode="cover" />
            )}
            {!!item.text && (
              <Text style={item.senderId === user?.uid ? styles.msgTextSent : styles.msgText}>
                {item.text}
              </Text>
            )}
          </View>
        )}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputArea}>
          <TouchableOpacity onPress={handleOpenCamera} disabled={uploading} style={styles.cameraBtn}>
            {uploading
              ? <ActivityIndicator size="small" color="#3B82F6" />
              : <Camera size={24} color="#3B82F6" />}
          </TouchableOpacity>

          <TextInput
            placeholder="Type message..."
            style={styles.chatInput}
            value={messageText}
            onChangeText={setMessageText}
            editable={!uploading}
            multiline
          />

          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: isConnected ? '#3B82F6' : '#EF4444' }]}
            onPress={handleAction}
            disabled={uploading}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  center: { justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offlineText: { fontSize: 10, color: '#EF4444', fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 12, borderRadius: 10, height: 40 },
  searchInput: { flex: 1, marginLeft: 8 },
  contactItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', alignItems: 'center', gap: 12 },
  contactIcon: { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  contactName: { fontSize: 15, fontWeight: '700', color: '#334155' },
  contactSub: { fontSize: 12, color: '#94A3B8' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#94A3B8' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  chatHeaderInfo: { flex: 1, marginLeft: 8 },
  chatTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  chatStatus: { fontSize: 11, fontWeight: '600' },
  chatIncidentType: { fontSize: 11, color: '#B45309', fontWeight: '700', marginTop: 3 },
  msgReceived: { backgroundColor: '#F1F5F9', padding: 10, borderRadius: 15, maxWidth: '80%', marginBottom: 10, alignSelf: 'flex-start' },
  msgSent: { backgroundColor: '#3B82F6', padding: 10, borderRadius: 15, maxWidth: '80%', alignSelf: 'flex-end', marginBottom: 10 },
  msgText: { color: '#1E293B' },
  msgTextSent: { color: '#FFF' },
  msgImage: { width: 220, height: 160, borderRadius: 10, marginBottom: 4 },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cameraBtn: { padding: 5, justifyContent: 'center', alignItems: 'center' },
  chatInput: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 15, minHeight: 40, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 18 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 18, maxHeight: '90%', elevation: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, lineHeight: 19, color: '#64748B', marginBottom: 12 },
  incidentList: { flexGrow: 0, flexShrink: 1 },
  incidentOption: { flexDirection: 'row', alignItems: 'center', padding: 11, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 11, marginBottom: 8 },
  incidentSelected: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6' },
  incidentName: { fontSize: 14, fontWeight: '700', color: '#334155' },
  incidentNameSelected: { color: '#1D4ED8' },
  incidentDescription: { fontSize: 11, lineHeight: 15, color: '#64748B', marginTop: 2 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#F1F5F9' },
  cancelText: { color: '#475569', fontWeight: '700' },
  continueBtn: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#2563EB' },
  disabledBtn: { backgroundColor: '#94A3B8' },
  continueText: { color: '#FFF', fontWeight: '700' },
  uploadOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  uploadBox: { backgroundColor: '#FFF', padding: 25, borderRadius: 16, alignItems: 'center', minWidth: 200, elevation: 5 },
  uploadText: { marginTop: 12, fontSize: 16, fontWeight: '700', color: '#1E293B' },
  uploadSubText: { fontSize: 12, color: '#64748B', marginTop: 4 },
  emptyChat: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyChatTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginTop: 14, marginBottom: 6 },
  emptyChatSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 18 }
});
