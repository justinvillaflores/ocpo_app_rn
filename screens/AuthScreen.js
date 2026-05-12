import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';

const OLONGAPO_BARANGAYS = [
  "Barretto", "East Bajac-bajac", "East Tapinac", "Gordon Heights",
  "Kalaklan", "Mabayuan", "New Asinan", "New Banicain", "New Cabalan",
  "New Ilalim", "New Kalalake", "New Kababae", "Old Cabalan",
  "Pag-Asa", "Sta Rita", "West Bajac-bajac", "West Tapinac"
].sort();

export default function AuthScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [searchBarangay, setSearchBarangay] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [barangay, setBarangay] = useState('');
  const [street, setStreet] = useState('');
  const [contact, setContact] = useState('');

  useEffect(() => {
    console.log("Checking auth status..."); // Dagdag mo ito
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User detected:", user.email); // Makikita mo ito sa terminal kung logged in
        navigation.replace('DirectoryScreen');
      } else {
        console.log("No user session found.");
        setIsCheckingAuth(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      return Alert.alert("Email Required", "Please enter your email address to reset your password.");
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("Password Reset", "A password reset link has been sent to your email.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleAuth = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return Alert.alert("Required", "Please enter both email and password.");
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      } else {
        if (!contact.trim() || !barangay || !street.trim()) {
          setLoading(false);
          return Alert.alert("Required", "Please complete all fields including your full address.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        const user = userCredential.user;

        const fullAddress = `${street.trim()}, Brgy. ${barangay}, Olongapo City`;

        await setDoc(doc(db, "users", user.uid), {
          username: username.trim(),
          address: fullAddress,
          barangay: barangay,
          street: street.trim(),
          phoneNumber: contact.trim(),
          email: trimmedEmail,
          role: 'citizen',
          createdAt: new Date().toISOString()
        });

        Alert.alert("Welcome!", "Account created successfully.");
      }
    } catch (error) {
      Alert.alert("Authentication Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#003399" />
        <Text style={{ marginTop: 10, color: '#003399' }}>Checking Session...</Text>
      </View>
    );
  }

  const filteredBarangays = OLONGAPO_BARANGAYS.filter(b =>
    b.toLowerCase().includes(searchBarangay.toLowerCase())
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logoText}>OneCall</Text>

      <Text style={styles.welcomeTitle}>{isLogin ? "Welcome Back" : "Create Account"}</Text>
      <Text style={styles.subTitle}>{isLogin ? "Login to your account" : "Register for emergency access"}</Text>

      <View style={styles.form}>
        {!isLogin && (
          <>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#003399" />
              <TextInput placeholder="Full Name" style={styles.input} value={username} onChangeText={setUsername} />
            </View>

            <TouchableOpacity style={styles.inputContainer} onPress={() => setShowAddressModal(true)}>
              <Ionicons name="location-outline" size={20} color="#003399" />
              <Text style={[styles.input, { color: barangay ? '#000' : '#999', paddingTop: 15 }]}>
                {barangay || "Select Barangay"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#003399" />
            </TouchableOpacity>

            {barangay !== '' && (
              <View style={[styles.inputContainer, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="map-outline" size={20} color="#003399" />
                <TextInput placeholder="House No. / Street" style={styles.input} value={street} onChangeText={setStreet} />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#003399" />
              <TextInput placeholder="Contact Number" style={styles.input} value={contact} onChangeText={setContact} keyboardType="phone-pad" />
            </View>
          </>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#003399" />
          <TextInput placeholder="Email Address" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#003399" />
          <TextInput placeholder="Password" style={styles.input} secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#003399" />
          </TouchableOpacity>
        </View>

        {isLogin && (
          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.rememberMe} onPress={() => setRememberMe(!rememberMe)}>
              <Ionicons name={rememberMe ? "checkbox" : "square-outline"} size={20} color={rememberMe ? "#0047AB" : "#666"} />
              <Text style={styles.rememberText}>Stay logged in</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.mainButton} onPress={handleAuth} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isLogin ? "Login" : "Sign Up"}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggleContainer}>
          <Text style={styles.toggleText}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Text style={{ color: '#003399', fontWeight: 'bold' }}>{isLogin ? "Sign Up" : "Login"}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showAddressModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Barangay</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput style={styles.modalSearch} placeholder="Search..." value={searchBarangay} onChangeText={setSearchBarangay} />
            <FlatList
              data={filteredBarangays}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.barangayItem} onPress={() => { setBarangay(item); setShowAddressModal(false); }}>
                  <Text style={styles.barangayText}>{item}</Text>
                  {barangay === item && <Ionicons name="checkmark-circle" size={20} color="#003399" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F8F9FA', alignItems: 'center', padding: 30, paddingTop: 80 },
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#003399', marginBottom: 60 },
  welcomeTitle: { fontSize: 28, fontWeight: '900', color: '#003399' },
  subTitle: { fontSize: 14, color: '#666', marginBottom: 30 },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, height: 55 },
  input: { flex: 1, marginLeft: 10, fontSize: 15 },
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 5 },
  rememberMe: { flexDirection: 'row', alignItems: 'center' },
  rememberText: { marginLeft: 8, fontSize: 13, color: '#666' },
  forgotText: { fontSize: 13, color: '#0047AB', fontWeight: 'bold' },
  mainButton: { backgroundColor: '#0047AB', borderRadius: 25, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  toggleContainer: { marginTop: 20, alignItems: 'center' },
  toggleText: { color: '#666', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, height: '70%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#003399' },
  modalSearch: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 14 },
  barangayItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between' },
  barangayText: { fontSize: 16, color: '#333' }
});