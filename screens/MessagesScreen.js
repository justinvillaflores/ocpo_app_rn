import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  TextInput, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, Alert
} from 'react-native';
import { Search, Shield, Send, Plus, ChevronLeft, Building2, WifiOff } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SMS from 'expo-sms';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';

import { db, auth, storage } from '../firebaseConfig';
import {
  collection, query, where, onSnapshot, orderBy,
  addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc, getDocs, limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';

export default function MessagesScreen() {
  const [inChat, setInChat] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const [responders, setResponders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState("Citizen");
  const [user, setUser] = useState(null);

  const flatListRef = useRef(null);

  // 1. Connection & Auth Watcher
  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    const unsubscribeAuth = onAuthStateChanged(auth, (authenticatedUser) => {
      if (authenticatedUser) setUser(authenticatedUser);
      else { setUser(null); setLoading(false); }
    });
    return () => { unsubscribeNet(); unsubscribeAuth(); };
  }, []);

  // 2. Load Profile
  useEffect(() => {
    const initSetup = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setCurrentUserName(userDoc.data().username || userDoc.data().name || "Citizen User");
          }
        } catch (e) { console.log("Profile load error:", e); }
      }
    };
    initSetup();
  }, [user]);

  // 3. Responders List (Offline-Ready via Firestore Cache)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users"), where("role", "==", "responder"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const responderList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setResponders(responderList);
      setLoading(false);
    }, async (error) => {
      // Fallback: Kahit may error (offline), susubukan pa rin kunin sa local cache
      const querySnapshot = await getDocs(q);
      setResponders(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 4. Chat Messages
  useEffect(() => {
    if (inChat && selectedContact && user) {
      const chatId = [user.uid, selectedContact.id].sort().join('_');
      const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "desc"), limit(50));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [inChat, selectedContact, user]);

  // INNOVATION: Offline SMS Dispatcher
  const handleSendSMS = async (textToSend) => {
    const phoneNumber = selectedContact?.phoneNumber || selectedContact?.phone;
    if (!phoneNumber) return Alert.alert("Error", "No registered number for this responder.");

    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      // Professional Emergency Template
      const smsBody = `[OneCall EMERGENCY]\nFrom: ${currentUserName}\nMessage: ${textToSend}`;

      const { result } = await SMS.sendSMSAsync([phoneNumber], smsBody);
      if (result === 'sent') {
        setMessageText("");
        Alert.alert("Success", "Emergency SMS has been sent.");
      }
    } else {
      Alert.alert("SMS Error", "Your device does not support SMS.");
    }
  };

  const handleAction = async () => {
    if (!messageText.trim() || !selectedContact || !user) return;

    // Trigger SMS mode if offline
    if (!isConnected) {
      Alert.alert(
        "Offline Mode",
        "You are currently offline. Use SMS for this emergency?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Send via SMS", onPress: () => handleSendSMS(messageText) }
        ]
      );
      return;
    }

    // Online: Firestore Logic
    const chatId = [user.uid, selectedContact.id].sort().join('_');
    const chatRef = doc(db, "chats", chatId);
    const tempMsg = messageText;
    setMessageText("");

    try {
      await setDoc(chatRef, {
        lastMessage: tempMsg,
        updatedAt: serverTimestamp(),
        participants: [user.uid, selectedContact.id],
        citizenName: currentUserName,
        responderName: selectedContact.name || selectedContact.username || "Responder"
      }, { merge: true });

      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: tempMsg,
        senderId: user.uid,
        receiverId: selectedContact.id,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleSendSMS(tempMsg); // Auto-fallback to SMS if Firestore fails
    }
  };

  const handlePickImage = async () => {
    if (!isConnected) return Alert.alert("Offline", "Photos require an internet connection.");
    // ... (Keep existing image picker logic)
  };

  const filteredResponders = responders.filter(item =>
    (item.name || item.username || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ResponderLogo = ({ url, size = 45 }) => (
    <View style={[styles.contactIcon, { width: size, height: size, borderRadius: size / 4 }]}>
      {url ? <Image source={{ uri: url }} style={styles.avatarImage} /> : <Building2 size={size * 0.5} color="#94A3B8" />}
    </View>
  );

  if (loading) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  if (!inChat) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.iconCircle}><Shield size={20} color="#3B82F6" /></View>
            <View>
                <Text style={styles.headerTitle}>Emergency Responders</Text>
                {!isConnected && <Text style={{fontSize: 10, color: '#EF4444', fontWeight: 'bold'}}>OFFLINE MODE ACTIVE</Text>}
            </View>
          </View>
          <View style={styles.searchBar}>
            <Search size={18} color="#94A3B8" />
            <TextInput placeholder="Search responder..." style={styles.searchInput} value={searchTerm} onChangeText={setSearchTerm} />
          </View>
        </View>
        <FlatList
          data={filteredResponders}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.contactItem} onPress={() => { setSelectedContact(item); setInChat(true); }}>
              <ResponderLogo url={item.imageUrl} />
              <View>
                <Text style={styles.contactName}>{item.name || item.username}</Text>
                <Text style={styles.contactSub}>{item.phoneNumber || item.phone || 'Local Responder'}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setInChat(false)}><ChevronLeft size={28} color="#1E293B" /></TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ResponderLogo url={selectedContact?.imageUrl} size={35} />
            <View>
              <Text style={styles.chatTitle}>{selectedContact?.name || selectedContact?.username}</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                {isConnected ? <Text style={styles.onlineDot}>●</Text> : <WifiOff size={12} color="#EF4444" />}
                <Text style={[styles.chatStatus, { color: isConnected ? '#10B981' : '#EF4444' }]}>
                   {isConnected ? 'Connected' : 'Offline - SMS Mode'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        inverted
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => (
          <View style={item.senderId === user?.uid ? styles.msgSent : styles.msgReceived}>
            {item.image && <Image source={{ uri: item.image }} style={styles.msgImage} resizeMode="cover" />}
            {item.text !== "" && <Text style={item.senderId === user?.uid ? styles.msgTextSent : styles.msgText}>{item.text}</Text>}
          </View>
        )}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputArea}>
          <TouchableOpacity onPress={handlePickImage} disabled={uploading || !isConnected}>
            {uploading ? <ActivityIndicator size="small" color="#3B82F6" /> : <Plus size={24} color={isConnected ? "#3B82F6" : "#CBD5E1"} />}
          </TouchableOpacity>
          <TextInput
            placeholder={isConnected ? "Type a message..." : "Send Emergency SMS..."}
            style={styles.chatInput}
            value={messageText}
            onChangeText={setMessageText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: isConnected ? '#3B82F6' : '#EF4444' }]}
            onPress={handleAction}
          >
            <Send size={18} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 15, borderRadius: 12, height: 45 },
  searchInput: { flex: 1, marginLeft: 10 },
  contactItem: { flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', alignItems: 'center', gap: 15 },
  contactIcon: { backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  contactName: { fontSize: 15, fontWeight: '700' },
  contactSub: { fontSize: 12, color: '#94A3B8' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  chatHeaderInfo: { flex: 1, marginLeft: 10 },
  chatTitle: { fontSize: 16, fontWeight: '700' },
  chatStatus: { fontSize: 11, fontWeight: '600' },
  onlineDot: { color: '#10B981', fontSize: 12 },
  msgReceived: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 18, maxWidth: '75%', marginBottom: 15, alignSelf: 'flex-start' },
  msgSent: { backgroundColor: '#3B82F6', padding: 12, borderRadius: 18, maxWidth: '75%', alignSelf: 'flex-end', marginBottom: 15 },
  msgText: { fontSize: 14, color: '#1E293B', lineHeight: 20 },
  msgTextSent: { fontSize: 14, color: 'white', lineHeight: 20 },
  msgImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 5 },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: 'white' },
  chatInput: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 25, height: 45, paddingHorizontal: 20 },
  sendBtn: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' }
});