
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Modal, FlatList, Image, Animated,
  LayoutAnimation, Platform, UIManager
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, onAuthStateChanged
} from 'firebase/auth';
import { setDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PHILSMS_API_TOKEN = '5121|FvPGbsJkGvOfGE2EZNR129SVZladGtFw8exInRcmc555b7e3';
const PHILSMS_SENDER_ID = 'PhilSMS';

const OLONGAPO_BARANGAYS = [
  'Barretto', 'East Bajac-bajac', 'East Tapinac', 'Gordon Heights',
  'Kalaklan', 'Mabayuan', 'New Asinan', 'New Banicain', 'New Cabalan',
  'New Ilalim', 'New Kalalake', 'New Kababae', 'Old Cabalan',
  'Pag-Asa', 'Sta Rita', 'West Bajac-bajac', 'West Tapinac'
].sort();

const PRIVACY_NOTICE = [
  {
    title: '1. Personal Information Collected',
    body: 'OneCall may collect your name, contact number, email address, barangay, street address, and information needed to support emergency services and account management.'
  },
  {
    title: '2. Purpose of Collection',
    body: 'Your information is used to manage your account, support emergency assistance, help identify your location when relevant to app features, and maintain the operation and security of OneCall.'
  },
  {
    title: '3. Access and Sharing',
    body: 'Access to personal information should be limited to authorized personnel who need it for legitimate OneCall and emergency-response purposes. Information should not be disclosed to unauthorized persons.'
  },
  {
    title: '4. Storage and Security',
    body: 'OneCall uses security measures intended to protect personal information. No system can guarantee absolute security. Appropriate technical safeguards and access restrictions must be maintained by the system administrators.'
  },
  {
    title: '5. Your Privacy Rights',
    body: 'Subject to applicable law, you may ask about your personal information, request correction, or raise concerns about its processing. Contact the appropriate OneCall administrator for privacy-related requests.'
  }
];

export default function AuthScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [searchBarangay, setSearchBarangay] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [barangay, setBarangay] = useState('');
  const [street, setStreet] = useState('');
  const [contact, setContact] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const toggleAuthMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 15, duration: 150, useNativeDriver: true })
    ]).start(() => {
      setIsLogin(!isLogin);
      setPrivacyConsent(false);
      setShowPassword(false);
      slideAnim.setValue(-15);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true })
      ]).start();
    });
  };

  useEffect(() => {
    let interval = null;

    if (showOTPModal && resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
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
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user && !isRegistering) {
        safeNavigateToNextScreen();
      } else {
        setIsCheckingAuth(false);
      }
    });

    return unsubscribe;
  }, [isRegistering]);

  const formatPhoneNumberE164 = number => {
    const cleaned = number.trim().replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('0')) return '+63' + cleaned.substring(1);
    if (!cleaned.startsWith('+')) return '+63' + cleaned;
    return cleaned;
  };

  const isValidEmail = value => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const checkPhoneNumberExists = async formattedPhone => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phoneNumber', '==', formattedPhone));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.log('Firestore check warning:', error.message);
      throw new Error('Unable to verify the contact number right now. Please try again.');
    }
  };

  const handleAuth = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return Alert.alert('Required', 'Please enter both email and password.');
    }

    if (!isValidEmail(trimmedEmail)) {
      return Alert.alert(
        'Invalid Email',
        'Please enter a valid email address, such as example@gmail.com.'
      );
    }

    if (trimmedPassword.length < 6) {
      return Alert.alert(
        'Password Too Short',
        'Your password must contain at least 6 characters.'
      );
    }

    if (isLogin) {
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      } catch (error) {
        Alert.alert('Authentication Error', error.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!firstName.trim() || !lastName.trim() || !contact.trim() || !barangay || !street.trim()) {
        return Alert.alert('Required', 'Please complete all required fields.');
      }

      if (!privacyConsent) {
        return Alert.alert(
          'Privacy Consent Required',
          'Please read the Data Privacy Notice and agree before continuing with registration.'
        );
      }

      const e164Phone = formatPhoneNumberE164(contact);

      if (e164Phone.length < 12) {
        return Alert.alert(
          'Invalid Number',
          'Please enter a valid PH contact number (e.g., 09123456789).'
        );
      }

      setLoading(true);
      setIsRegistering(true);

      try {
        const phoneExists = await checkPhoneNumberExists(e164Phone);

        if (phoneExists) {
          setLoading(false);
          setIsRegistering(false);
          return Alert.alert(
            'Already Registered',
            'This mobile number is already taken by another account.'
          );
        }

        await requestOTPCode(e164Phone);
      } catch (error) {
        setIsRegistering(false);
        setLoading(false);
        Alert.alert('Registration Error', error.message);
      }
    }
  };

  const requestOTPCode = async formattedPhone => {
    setIsSendingOTP(true);

    try {
      const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOTP(newOTP);

      const response = await fetch('https://dashboard.philsms.com/api/v3/sms/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PHILSMS_API_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          recipient: formattedPhone,
          sender_id: PHILSMS_SENDER_ID,
          type: 'plain',
          message: `OneCall PIN: ${newOTP}. Do not share with anyone.`
        })
      });

      const resData = await response.json();

      if (
        response.ok &&
        (resData.status === 'success' || resData.code === '200' || resData.code === 200)
      ) {
        setShowOTPModal(true);
        setResendTimer(60);
        setCanResend(false);
        setVerificationCode('');
        Alert.alert('OTP Sent', `We sent a verification code to ${formattedPhone}`);
      } else {
        throw new Error(
          Array.isArray(resData.message)
            ? resData.message[0]
            : resData.message || 'Failed to send SMS via PhilSMS.'
        );
      }
    } catch (error) {
      console.error('PhilSMS OTP Error:', error);
      Alert.alert(
        'OTP Delivery Error',
        error.message || 'Failed to send SMS code. Please check your network connection.'
      );
      setIsRegistering(false);
    } finally {
      setIsSendingOTP(false);
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!verificationCode || verificationCode.trim().length !== 6) {
      return Alert.alert('Invalid Code', 'Please enter the complete 6-digit OTP code.');
    }

    if (verificationCode.trim() !== generatedOTP) {
      return Alert.alert(
        'Verification Failed',
        'Incorrect OTP code. Please check the SMS and try again.'
      );
    }

    setIsVerifyingOTP(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password.trim()
      );

      const user = userCredential.user;
      const e164Phone = formatPhoneNumberE164(contact);
      const fullName = [firstName.trim(), middleName.trim(), lastName.trim()]
        .filter(Boolean)
        .join(' ');
      const fullAddress = `${street.trim()}, Brgy. ${barangay}, Olongapo City`;

      await setDoc(doc(db, 'users', user.uid), {
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        fullName,
        username: fullName,
        address: fullAddress,
        barangay,
        street: street.trim(),
        phoneNumber: e164Phone,
        isPhoneVerified: true,
        email: email.trim(),
        role: 'citizen',
        privacyConsent: true,
        privacyConsentVersion: '1.0',
        privacyConsentAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      setShowOTPModal(false);
      setIsRegistering(false);
      Alert.alert('Success', 'Phone number verified and account created successfully!');
      safeNavigateToNextScreen();
    } catch (error) {
      console.error('Firebase Registration Error:', error);
      Alert.alert('Registration Error', error.message);
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || isSendingOTP) return;
    await requestOTPCode(formatPhoneNumberE164(contact));
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      return Alert.alert('Email Required', 'Please enter your email address.');
    }

    if (!isValidEmail(email)) {
      return Alert.alert('Invalid Email', 'Please enter a valid email address.');
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Email Sent', 'Check your email inbox for the password reset link.');
    } catch (error) {
      Alert.alert('Error', error.message);
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

  const filteredBarangays = OLONGAPO_BARANGAYS.filter(
    b => b.toLowerCase().includes(searchBarangay.toLowerCase())
  );

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Image source={require('../assets/1010.png')} style={styles.logoImage} />

      <Animated.View style={{ width: '100%', alignItems: 'center', opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Text style={styles.welcomeTitle}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
        <Text style={styles.subTitle}>{isLogin ? 'Login to your account' : 'Register for emergency access'}</Text>

        <View style={styles.form}>
          {!isLogin && (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#003399" />
                <TextInput placeholder="First Name" style={styles.input} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#003399" />
                <TextInput placeholder="Middle Name (Optional)" style={styles.input} value={middleName} onChangeText={setMiddleName} autoCapitalize="words" />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#003399" />
                <TextInput placeholder="Last Name" style={styles.input} value={lastName} onChangeText={setLastName} autoCapitalize="words" />
              </View>
              <TouchableOpacity style={styles.inputContainer} onPress={() => setShowAddressModal(true)}>
                <Ionicons name="location-outline" size={20} color="#003399" />
                <Text style={[styles.input, { color: barangay ? '#000' : '#999', paddingTop: 15 }]}>
                  {barangay || 'Select Barangay'}
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
                <TextInput placeholder="Contact Number (e.g., 09123456789)" style={styles.input} value={contact} onChangeText={setContact} keyboardType="phone-pad" />
              </View>
            </>
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#003399" />
            <TextInput
              placeholder="Email Address"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#003399" />
            <TextInput
              placeholder="Password "
              style={styles.input}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#003399" />
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setPrivacyConsent(prev => !prev)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: privacyConsent }}
            >
              <Ionicons name={privacyConsent ? 'checkbox' : 'square-outline'} size={24} color="#003399" />
              <Text style={styles.consentText}>
                I have read and agree to the{' '}
                <Text style={styles.privacyLink} onPress={() => setShowPrivacyModal(true)}>
                  Data Privacy Notice
                </Text>
                {' '}and understand how OneCall processes my personal information.
              </Text>
            </TouchableOpacity>
          )}

          {isLogin && (
            <View style={styles.optionsContainer}>
              <Text style={styles.rememberText}>Stay logged in</Text>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.mainButton} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Sign Up'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleAuthMode} style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: '#003399', fontWeight: 'bold' }}>{isLogin ? 'Sign Up' : 'Login'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Modal visible={showPrivacyModal} animationType="slide" transparent onRequestClose={() => setShowPrivacyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Data Privacy Notice</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.privacyIntro}>
                OneCall respects your privacy and aims to handle your personal information in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173).
              </Text>
              {PRIVACY_NOTICE.map(item => (
                <View key={item.title} style={styles.privacySection}>
                  <Text style={styles.privacyHeading}>{item.title}</Text>
                  <Text style={styles.privacyBody}>{item.body}</Text>
                </View>
              ))}
              <Text style={styles.privacyDisclaimer}>
                Please contact the appropriate OneCall administrator for privacy questions or requests. This notice should be reviewed and finalized by the project adviser or the responsible data protection representative before deployment.
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.mainButton} onPress={() => { setPrivacyConsent(true); setShowPrivacyModal(false); }}>
              <Text style={styles.buttonText}>I Agree and Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelPrivacyButton} onPress={() => setShowPrivacyModal(false)}>
              <Text style={styles.cancelPrivacyText}>Close Without Agreeing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddressModal} animationType="slide" transparent onRequestClose={() => setShowAddressModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Barangay</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput style={styles.barangaySearchInput} placeholder="Search barangay..." value={searchBarangay} onChangeText={setSearchBarangay} />
            <FlatList
              data={filteredBarangays}
              keyExtractor={item => item}
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

      <Modal visible={showOTPModal} animationType="slide" transparent onRequestClose={() => { setShowOTPModal(false); setIsRegistering(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter OTP Code</Text>
              <TouchableOpacity onPress={() => { setShowOTPModal(false); setIsRegistering(false); }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Text style={styles.otpDescription}>
              We sent a 6-digit verification code to{' '}
              <Text style={{ fontWeight: 'bold' }}>{formatPhoneNumberE164(contact)}</Text>
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
            <TouchableOpacity style={styles.mainButton} onPress={handleVerifyOTP} disabled={isVerifyingOTP}>
              {isVerifyingOTP ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify & Create Account</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.resendContainer} onPress={handleResendOTP} disabled={!canResend || isSendingOTP}>
              <Text style={[styles.resendText, { color: canResend ? '#003399' : '#999' }]}>
                {canResend ? 'Resend Code' : `Resend code in ${resendTimer}s`}
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
  mainButton: { backgroundColor: '#0047AB', borderRadius: 25, minHeight: 55, justifyContent: 'center', alignItems: 'center', marginTop: 10, paddingHorizontal: 14 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  toggleContainer: { marginTop: 20, alignItems: 'center' },
  toggleText: { color: '#666', fontSize: 13 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16, paddingHorizontal: 3 },
  consentText: { flex: 1, color: '#444', fontSize: 12, lineHeight: 18 },
  privacyLink: { color: '#0047AB', fontWeight: 'bold', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 35, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#003399', flex: 1 },
  barangaySearchInput: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 15 },
  barangayItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between' },
  barangayText: { fontSize: 16, color: '#333' },
  otpDescription: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  otpInputContainer: { backgroundColor: '#F1F5F9', borderRadius: 12, marginBottom: 20, height: 55, justifyContent: 'center' },
  otpInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: 'bold', color: '#003399' },
  resendContainer: { marginTop: 15, alignItems: 'center' },
  resendText: { fontSize: 14, fontWeight: '600' },
  privacyIntro: { fontSize: 13, lineHeight: 20, color: '#444', marginBottom: 15 },
  privacySection: { marginBottom: 15 },
  privacyHeading: { color: '#003399', fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  privacyBody: { color: '#555', fontSize: 13, lineHeight: 20 },
  privacyDisclaimer: { color: '#777', fontSize: 12, lineHeight: 18, marginVertical: 12 },
  cancelPrivacyButton: { alignItems: 'center', padding: 12 },
  cancelPrivacyText: { color: '#666', fontSize: 13, fontWeight: '600' }
});
