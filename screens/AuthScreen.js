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
import { setDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';

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

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [searchBarangay, setSearchBarangay] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [barangay, setBarangay] = useState('');
  const [street, setStreet] = useState('');
  const [contact, setContact] = useState('');

  // OTP Verification States
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);

  // Resend OTP States
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);

  // Countdown Timer Logic para sa Resend OTP
  useEffect(() => {
    let interval = null;
    if (showOTPModal && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showOTPModal, resendTimer]);

  // Safe navigation helper
  const safeNavigateToNextScreen = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      try {
        navigation.replace('DirectoryScreen');
      } catch (err) {
        navigation.navigate('DirectoryScreen');
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        safeNavigateToNextScreen();
      } else {
        setIsCheckingAuth(false);
      }
    });
    return unsubscribe;
  }, []);

  // Format mobile number to +63 format
  const formatPhoneNumber = (number) => {
    let cleaned = number.trim().replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('0')) {
      return '+63' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('+')) {
      return '+63' + cleaned;
    }
    return cleaned;
  };

  // Check if phone number already exists in Firestore
  const checkPhoneNumberExists = async (formattedPhone) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phoneNumber", "==", formattedPhone));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.log("Error checking phone existence:", error);
      return false;
    }
  };

  // Fast direct SMS OTP dispatch function
  const sendOTPToPhone = async (phoneNumber, otp) => {
    console.log(`[FAST SMS GATEWAY] Sending OTP ${otp} to ${phoneNumber}`);

    /*
      Para sa totoong SMS (mabilis / instant):
      I-uncomment at ilagay ang iyong Semaphore / SMS API details:

      const response = await fetch('https://api.semaphore.co/api/v4/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          apikey: 'YOUR_SEMAPHORE_API_KEY',
          number: phoneNumber,
          message: `Your OneCall OTP is: ${otp}. Do not share this code with anyone.`,
          sendername: 'OneCall'
        }).toString()
      });
    */
  };

  // Master function para mag-generate at mag-send ng OTP
  const triggerOTPSend = async (formattedPhone) => {
    setIsSendingOTP(true);
    const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(newOTP);

    await sendOTPToPhone(formattedPhone, newOTP);

    // Reset Resend Timer
    setResendTimer(30);
    setCanResend(false);
    setIsSendingOTP(false);
    return newOTP;
  };

  const handleAuth = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return Alert.alert("Required", "Please enter both email and password.");
    }

    if (isLogin) {
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      } catch (error) {
        Alert.alert("Authentication Error", error.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Validate Sign Up inputs
      if (!contact.trim() || !barangay || !street.trim() || !username.trim()) {
        return Alert.alert("Required", "Please complete all fields.");
      }

      const formattedPhone = formatPhoneNumber(contact);
      if (formattedPhone.length < 13) {
        return Alert.alert("Invalid Number", "Please enter a valid mobile number (e.g., 09123456789).");
      }

      setLoading(true);

      try {
        // Step 1: Check uniqueness of phone number in Firestore
        const phoneExists = await checkPhoneNumberExists(formattedPhone);
        if (phoneExists) {
          setLoading(false);
          return Alert.alert("Already Registered", "This mobile number is already registered to another account.");
        }

        // Step 2: Trigger Instant OTP Send
        await triggerOTPSend(formattedPhone);

        setLoading(false);
        setShowOTPModal(true);
        Alert.alert("OTP Verification", `Verification code sent to ${formattedPhone}`);
      } catch (error) {
        setLoading(false);
        Alert.alert("Error", error.message || "Failed to process mobile verification.");
      }
    }
  };

  // Function para sa Resend OTP button
  const handleResendOTP = async () => {
    if (!canResend) return;
    const formattedPhone = formatPhoneNumber(contact);
    try {
      await triggerOTPSend(formattedPhone);
      Alert.alert("OTP Resent", `A new verification code has been sent to ${formattedPhone}`);
    } catch (error) {
      Alert.alert("Error", "Failed to resend code. Please try again.");
    }
  };

  // Step 3: Verify OTP Code and Register Account
  const handleVerifyOTPAndRegister = async () => {
    if (!verificationCode.trim() || verificationCode.trim().length !== 6) {
      return Alert.alert("Required", "Please enter a valid 6-digit verification code.");
    }

    if (verificationCode.trim() !== generatedOTP) {
      return Alert.alert("Invalid Code", "The OTP you entered is incorrect. Please try again.");
    }

    setIsVerifyingOTP(true);

    try {
      // Create Email/Password account sa Firebase
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const user = userCredential.user;

      const fullAddress = `${street.trim()}, Brgy. ${barangay}, Olongapo City`;

      // Save user profile details to Firestore kasama ang verified phone number
      await setDoc(doc(db, "users", user.uid), {
        username: username.trim(),
        address: fullAddress,
        barangay: barangay,
        street: street.trim(),
        phoneNumber: formatPhoneNumber(contact),
        isPhoneVerified: true,
        email: trimmedEmail,
        role: 'citizen',
        createdAt: new Date().toISOString()
      });

      setShowOTPModal(false);
      Alert.alert("Success", "Account verified and created successfully!");
    } catch (error) {
      Alert.alert("Registration Error", error.message || "Failed to complete account registration.");
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) return Alert.alert("Email Required", "Please enter your email.");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("Sent", "Check your email for the reset link.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003399" />
        <Text style={styles.loadingText}>Loading OneCall...</Text>
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
              <TextInput
                placeholder="Contact Number (e.g., 09123456789)"
                style={styles.input}
                value={contact}
                onChangeText={setContact}
                keyboardType="phone-pad"
              />
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
            <Text style={styles.rememberText}>Stay logged in</Text>
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

      {/* Barangay Selection Modal */}
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

      {/* Phone OTP Verification Modal */}
      <Modal visible={showOTPModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Mobile Number</Text>
              <TouchableOpacity onPress={() => setShowOTPModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 15 }}>
              Enter the 6-digit code sent to {contact}:
            </Text>
            <TextInput
              style={styles.modalSearch}
              placeholder="Enter 6-digit OTP"
              keyboardType="number-pad"
              maxLength={6}
              value={verificationCode}
              onChangeText={setVerificationCode}
            />

            {/* Resend OTP Section */}
            <View style={styles.resendContainer}>
              {canResend ? (
                <TouchableOpacity onPress={handleResendOTP} disabled={isSendingOTP}>
                  {isSendingOTP ? (
                    <ActivityIndicator size="small" color="#003399" />
                  ) : (
                    <Text style={styles.resendActiveText}>Resend OTP Code</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendDisabledText}>
                  Resend code in <Text style={{ fontWeight: 'bold' }}>{resendTimer}s</Text>
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.mainButton, { marginTop: 15 }]}
              onPress={handleVerifyOTPAndRegister}
              disabled={isVerifyingOTP}
            >
              {isVerifyingOTP ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Confirm & Sign Up</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#003399', fontWeight: 'bold' },
  container: { flexGrow: 1, backgroundColor: '#F8F9FA', alignItems: 'center', padding: 30, paddingTop: 80 },
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#003399', marginBottom: 60 },
  welcomeTitle: { fontSize: 28, fontWeight: '900', color: '#003399' },
  subTitle: { fontSize: 14, color: '#666', marginBottom: 30 },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, height: 55 },
  input: { flex: 1, marginLeft: 10, fontSize: 15 },
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 5 },
  rememberText: { fontSize: 13, color: '#666' },
  forgotText: { fontSize: 13, color: '#0047AB', fontWeight: 'bold' },
  mainButton: { backgroundColor: '#0047AB', borderRadius: 25, height: 55, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  toggleContainer: { marginTop: 20, alignItems: 'center' },
  toggleText: { color: '#666', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#003399' },
  modalSearch: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 16, textAlign: 'center', letterSpacing: 2 },
  barangayItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between' },
  barangayText: { fontSize: 16, color: '#333' },
  resendContainer: { alignItems: 'center', marginVertical: 10 },
  resendActiveText: { color: '#003399', fontWeight: 'bold', fontSize: 14 },
  resendDisabledText: { color: '#888', fontSize: 13 }
});