import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, FlatList, Image,
  Animated, LayoutAnimation, Platform, UIManager
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  PhoneAuthProvider,
  linkWithCredential
} from 'firebase/auth';
import { setDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const OLONGAPO_BARANGAYS = [
  "Barretto", "East Bajac-bajac", "East Tapinac", "Gordon Heights",
  "Kalaklan", "Mabayuan", "New Asinan", "New Banicain", "New Cabalan",
  "New Ilalim", "New Kalalake", "New Kababae", "Old Cabalan",
  "Pag-Asa", "Sta Rita", "West Bajac-bajac", "West Tapinac"
].sort();

export default function AuthScreen({ navigation }) {
  // ReCAPTCHA ref specifically for Expo / React Native WebViews
  const recaptchaVerifier = useRef(null);

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [searchBarangay, setSearchBarangay] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [barangay, setBarangay] = useState('');
  const [street, setStreet] = useState('');
  const [contact, setContact] = useState('');

  // Firebase Phone Auth States
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);

  // Resend OTP States
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const toggleAuthMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 15,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsLogin(!isLogin);
      slideAnim.setValue(-15);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

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
      if (user && !isRegistering) {
        safeNavigateToNextScreen();
      } else {
        setIsCheckingAuth(false);
      }
    });
    return unsubscribe;
  }, [isRegistering]);

  const formatPhoneNumberE164 = (number) => {
    let cleaned = number.trim().replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('0')) {
      return '+63' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('+')) {
      return '+63' + cleaned;
    }
    return cleaned;
  };

  const checkPhoneNumberExists = async (formattedPhone) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phoneNumber", "==", formattedPhone));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.log("Firestore check warning:", error.message);
      return false;
    }
  };

  const triggerFirebaseOTPSend = async (e164Phone) => {
    setIsSendingOTP(true);

    try {
      if (!recaptchaVerifier.current) {
        Alert.alert(
          "Initialization Error",
          "ReCAPTCHA component is preparing. Please wait 2 seconds and tap Sign Up again."
        );
        return false;
      }

      const phoneProvider = new PhoneAuthProvider(auth);
      const newVerificationId = await phoneProvider.verifyPhoneNumber(
        e164Phone,
        recaptchaVerifier.current
      );

      setVerificationId(newVerificationId);
      setResendTimer(30);
      setCanResend(false);
      Alert.alert("SMS Code Sent", `The OTP code has been sent to ${e164Phone}. Please check your SMS.`);
      return true;
    } catch (error) {
      console.error("Firebase Phone Auth Error:", error);
      Alert.alert(
        "Phone Verification Failed",
        error.message || "Failed to send SMS code. Please verify SHA-1 settings in Firebase or check your phone number."
      );
      throw error;
    } finally {
      setIsSendingOTP(false);
      setLoading(false);
    }
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
      if (!contact.trim() || !barangay || !street.trim() || !username.trim()) {
        return Alert.alert("Required", "Please complete all fields.");
      }

      const e164Phone = formatPhoneNumberE164(contact);
      if (e164Phone.length < 12) {
        return Alert.alert("Invalid Number", "Please enter a valid PH contact number (e.g., 09123456789).");
      }

      setLoading(true);
      setIsRegistering(true);

      try {
        const phoneExists = await checkPhoneNumberExists(e164Phone);
        if (phoneExists) {
          setLoading(false);
          setIsRegistering(false);
          return Alert.alert("Already Registered", "This mobile number is already registered.");
        }

        const sent = await triggerFirebaseOTPSend(e164Phone);
        if (sent) {
          setShowOTPModal(true);
        }
      } catch (error) {
        setIsRegistering(false);
        setLoading(false);
      }
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    const e164Phone = formatPhoneNumberE164(contact);
    try {
      await triggerFirebaseOTPSend(e164Phone);
    } catch (error) {
      // Handled in trigger
    }
  };

  const handleVerifyOTPAndRegister = async () => {
    const cleanCode = verificationCode.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      return Alert.alert("Required", "Please enter a valid 6-digit verification code.");
    }

    if (!verificationId) {
      return Alert.alert("Error", "No verification session found. Please request a new code.");
    }

    setIsVerifyingOTP(true);

    try {
      const phoneCredential = PhoneAuthProvider.credential(
        verificationId,
        cleanCode
      );

      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const user = userCredential.user;

      try {
        await linkWithCredential(user, phoneCredential);
      } catch (linkError) {
        console.warn("Phone linking warning:", linkError.message);
      }

      const fullAddress = `${street.trim()}, Brgy. ${barangay}, Olongapo City`;
      await setDoc(doc(db, "users", user.uid), {
        username: username.trim(),
        address: fullAddress,
        barangay: barangay,
        street: street.trim(),
        phoneNumber: formatPhoneNumberE164(contact),
        isPhoneVerified: true,
        email: trimmedEmail,
        role: 'citizen',
        createdAt: new Date().toISOString()
      });

      setShowOTPModal(false);
      setIsRegistering(false);
      Alert.alert("Success", "Account created and phone number verified successfully!");
      safeNavigateToNextScreen();
    } catch (error) {
      console.error("Registration Error:", error);
      Alert.alert("Verification Error", error.message || "Invalid OTP code or registration failed.");
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) return Alert.alert("Email Required", "Please enter your email address.");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("Email Sent", "Check your email inbox for the password reset link.");
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
      {/* Firebase ReCAPTCHA Verifier Modal */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={auth.app.options}
        attemptInvisibleVerification={false}
      />

      <Image
        source={require('../assets/1010.png')}
        style={styles.logoImage}
      />

      <Animated.View
        style={{
          width: '100%',
          alignItems: 'center',
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}
      >
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

          <TouchableOpacity onPress={toggleAuthMode} style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <Text style={{ color: '#003399', fontWeight: 'bold' }}>{isLogin ? "Sign Up" : "Login"}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

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
            <TextInput
              style={styles.barangaySearchInput}
              placeholder="Search barangay..."
              value={searchBarangay}
              onChangeText={setSearchBarangay}
            />
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
              <TouchableOpacity onPress={() => { setShowOTPModal(false); setIsRegistering(false); }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 15 }}>
              Enter the 6-digit verification code sent to {contact}:
            </Text>
            <TextInput
              style={styles.otpInput}
              placeholder="0 0 0 0 0 0"
              keyboardType="number-pad"
              maxLength={6}
              value={verificationCode}
              onChangeText={setVerificationCode}
            />

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
  container: { flexGrow: 1, backgroundColor: '#F8F9FA', alignItems: 'center', padding: 30, paddingTop: 120 },
  logoImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 25, resizeMode: 'cover' },
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
  barangaySearchInput: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 15, textAlign: 'left' },
  otpInput: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 16, textAlign: 'center', letterSpacing: 4, fontWeight: 'bold' },
  barangayItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between' },
  barangayText: { fontSize: 16, color: '#333' },
  resendContainer: { alignItems: 'center', marginVertical: 10 },
  resendActiveText: { color: '#003399', fontWeight: 'bold', fontSize: 14 },
  resendDisabledText: { color: '#888', fontSize: 13 }
});