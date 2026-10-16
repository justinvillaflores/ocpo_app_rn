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
} from 'firebase/auth';
import { setDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ========================================================
// PHILSMS API CONFIGURATION
// ========================================================
// Inilagay na rito ang iyong API Token at default Sender ID
const PHILSMS_API_TOKEN = '5121|FvPGbsJkGvOfGE2EZNR129SVZladGtFw8exInRcmc555b7e3';
const PHILSMS_SENDER_ID = 'PhilSMS';

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
  const [isRegistering, setIsRegistering] = useState(false);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [searchBarangay, setSearchBarangay] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [barangay, setBarangay] = useState('');
  const [street, setStreet] = useState('');
  const [contact, setContact] = useState('');

  // Custom OTP States (PhilSMS Gateway)
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);

  // Resend Timer States
  const [resendTimer, setResendTimer] = useState(60);
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

  // OTP Resend Countdown Logic
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

  // Step 1: Trigger Login or Register (Starts OTP sending)
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
      // Registration Validation
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
        // Check if phone exists in Firestore
        const phoneExists = await checkPhoneNumberExists(e164Phone);
        if (phoneExists) {
          setLoading(false);
          setIsRegistering(false);
          return Alert.alert("Already Registered", "This mobile number is already taken by another account.");
        }

        await requestOTPCode(e164Phone);
      } catch (error) {
        setIsRegistering(false);
        setLoading(false);
      }
    }
  };

  // Step 2: Magpadala ng Totoong SMS OTP gamit ang PhilSMS API
  const requestOTPCode = async (formattedPhone) => {
    setIsSendingOTP(true);
    try {
      // Mag-generate ng random 6-digit OTP code
      const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOTP(newOTP);

      // Tawagin ang PhilSMS API HTTP POST Endpoint
      const response = await fetch('https://dashboard.philsms.com/api/v3/sms/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PHILSMS_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          recipient: formattedPhone,
          sender_id: PHILSMS_SENDER_ID,
          type: 'plain',
          message: `Ang iyong OneCall OTP code ay: ${newOTP}. Valid ito para sa pag-verify ng iyong account.`
        })
      });

      const resData = await response.json();

      if (response.ok && (resData.status === 'success' || resData.code === '200')) {
        setShowOTPModal(true);
        setResendTimer(60);
        setCanResend(false);
        Alert.alert("OTP Sent", `Nagsend kami ng verification code sa ${formattedPhone}`);
      } else {
        throw new Error(resData.message || resData.message?.[0] || 'Nabigo sa pagpapadala ng SMS via PhilSMS.');
      }
    } catch (error) {
      console.error("PhilSMS OTP Error:", error);
      Alert.alert(
        "OTP Delivery Error",
        error.message || "Failed to send SMS code. Please check your network connection."
      );
      setIsRegistering(false);
    } finally {
      setIsSendingOTP(false);
      setLoading(false);
    }
  };

  // Step 3: I-verify ang in-input na OTP ng user at i-save ang User account sa Firebase
  const handleVerifyOTP = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      return Alert.alert("Invalid Code", "Please enter the complete 6-digit OTP code.");
    }

    if (verificationCode.trim() !== generatedOTP) {
      return Alert.alert("Verification Failed", "Incorrect OTP code. Please check the SMS and try again.");
    }

    setIsVerifyingOTP(true);
    try {
      // Verified na ang Totoong CP Number! I-create na ang account sa Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      const user = userCredential.user;

      const e164Phone = formatPhoneNumberE164(contact);
      const fullAddress = `${street.trim()}, Brgy. ${barangay}, Olongapo City`;

      // I-save sa Firestore
      await setDoc(doc(db, "users", user.uid), {
        username: username.trim(),
        address: fullAddress,
        barangay: barangay,
        street: street.trim(),
        phoneNumber: e164Phone,
        isPhoneVerified: true,
        email: email.trim(),
        role: 'citizen',
        createdAt: new Date().toISOString()
      });

      setShowOTPModal(false);
      setIsRegistering(false);
      Alert.alert("Success", "Phone number verified and account created successfully!");
      safeNavigateToNextScreen();
    } catch (error) {
      console.error("Firebase Registration Error:", error);
      Alert.alert("Registration Error", error.message);
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    const e164Phone = formatPhoneNumberE164(contact);
    await requestOTPCode(e164Phone);
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

      {/* OTP Verification Modal */}
      <Modal visible={showOTPModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter OTP Code</Text>
              <TouchableOpacity onPress={() => { setShowOTPModal(false); setIsRegistering(false); }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.otpDescription}>
              We sent a 6-digit verification code to <Text style={{ fontWeight: 'bold' }}>{formatPhoneNumberE164(contact)}</Text>
            </Text>

            <View style={styles.otpInputContainer}>
              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={verificationCode}
                onChangeText={setVerificationCode}
              />
            </View>

            <TouchableOpacity
              style={styles.mainButton}
              onPress={handleVerifyOTP}
              disabled={isVerifyingOTP}
            >
              {isVerifyingOTP ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify & Create Account</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendContainer}
              onPress={handleResendOTP}
              disabled={!canResend || isSendingOTP}
            >
              <Text style={[styles.resendText, { color: canResend ? '#003399' : '#999' }]}>
                {canResend ? "Resend Code" : `Resend code in ${resendTimer}s`}
              </Text>
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
  barangayItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between' },
  barangayText: { fontSize: 16, color: '#333' },
  otpDescription: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  otpInputContainer: { backgroundColor: '#F1F5F9', borderRadius: 12, marginBottom: 20, height: 55, justifyContent: 'center' },
  otpInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: 'bold', color: '#003399' },
  resendContainer: { marginTop: 15, alignItems: 'center' },
  resendText: { fontSize: 14, fontWeight: '600' }
});