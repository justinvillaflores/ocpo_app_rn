import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomTabBar from './CustomTabBar';

const Tab = createBottomTabNavigator();

function DirectoryScreen() {
  const emergencyHotlines = [
    { name: '911', number: '911', logo: require('./assets/911 logo.png') },
  ];

  const policeStations = [
    { name: 'Station 1', number: '09985985547', logo: require('./assets/1.png') },
    { name: 'Station 2', number: '09985985549', logo: require('./assets/22.png') },
    { name: 'Station 3', number: '09985985561', logo: require('./assets/3.png') },
    { name: 'Station 4', number: '09985985563', logo: require('./assets/4.png') },
    { name: 'Station 5', number: '09985985567', logo: require('./assets/5.png') },
    { name: 'Station 6', number: '09985985569', logo: require('./assets/6.png') },
  ];

  const otherHotlines = [
    { name: 'BFP', number: '09512779025', logo: require('./assets/BFP.png') },
    { name: 'CDRRMO', number: '09985937446', logo: require('./assets/cdrrmo.png') },
    { name: 'OEDC', number: '09989763369', logo: require('./assets/oedc.png') },
    { name: 'OTPMS', number: '09289178420', logo: require('./assets/otmps.png') },
    { name: 'Olongapo CMFC', number: '09204154070', logo: require('./assets/cmfc1.png') },
    { name: 'Subic Water', number: '09701079495', logo: require('./assets/subicwater.png') },
  ].sort((a, b) => a.name.localeCompare(b.name));

  const barangays = [
    { name: 'Barretto', number: '09389495840', logo: require('./assets/barretto.png') },
    { name: 'East Bajac-bajac', number: '09472171542', logo: require('./assets/ebb.png') },
    { name: 'East Tapinac', number: '09985604325', logo: require('./assets/eastTapinac.png') },
    { name: 'Gordon Heights\n(Globe)', number: '09664632688', logo: require('./assets/GH.png') },
    { name: 'Gordon Heights\n(Smart)', number: '09208278618', logo: require('./assets/GH.png') },
    { name: 'GH-Rescue\n(Globe)', number: '09173065966', logo: require('./assets/GH.png') },
    { name: 'GH-Rescue\n(Smart)', number: '09985937446', logo: require('./assets/GH.png') },
    { name: 'Kalaklan\n(Rescue)', number: '09671255737', logo: require('./assets/kalaklan.png') },
    { name: 'Mabayuan\n(BPAT)', number: '09605826032', logo: require('./assets/mabayuan.png') },
    { name: 'Mabayuan\n(Rescue)', number: '09190031577', logo: require('./assets/mabayuan.png') },
    { name: 'New Asinan', number: '09628651046', logo: require('./assets/newAsinan.png') },
    { name: 'New Banicain', number: '09086864304', logo: require('./assets/newBanicain.png') },
    { name: 'New Cabalan', number: '09104845635', logo: require('./assets/newcab.png') },
    { name: 'New Ilalim', number: '09476020328', logo: require('./assets/newIlalim.png') },
    { name: 'New Kalalake', number: '099457500537', logo: require('./assets/newKalalake.png') },
    { name: 'New Kababae', number: '09671924651', logo: require('./assets/newKababae.png') },
    { name: 'Old Cabalan', number: '09484745635', logo: require('./assets/oldcab.png') },
    { name: 'Pag-Asa', number: '09705730136', logo: require('./assets/pagasa.png') },
    { name: 'Sta Rita\n(BPAT)', number: '09816022965', logo: require('./assets/starita.png') },
    { name: 'Sta Rita\n(Rescue)', number: '09318330840', logo: require('./assets/starita.png') },
    { name: 'West Bajac-bajac', number: '09485075752', logo: require('./assets/wbb.png') },
    { name: 'West Tapinac', number: '09999911249', logo: require('./assets/westTapinac.png') },
  ];

  const renderGrid = (items, columns = 3) => {
    const rows = [];
    for (let i = 0; i < items.length; i += columns) {
      const rowItems = items.slice(i, i + columns);
      let justifyContent = 'space-between';

      if (rowItems.length === 1) justifyContent = 'flex-start';
      else if (rowItems.length === 2) justifyContent = 'flex-start';

      rows.push(
        <View
          key={i}
          style={{
            flexDirection: 'row',
            justifyContent,
            marginBottom: 20,
          }}
        >
          {rowItems.map((item, index) => {
            let extraStyle = {};
            if (rowItems.length === 2 && index === 1) {
              extraStyle = { marginLeft: '5%' };
            }

            return (
              <TouchableOpacity
                key={index}
                onPress={() => Linking.openURL(`tel:${item.number}`)}
                style={{ width: '30%', alignItems: 'center', ...extraStyle }}
              >
                <Image
                  source={item.logo}
                  style={{
                    width: 60,
                    height: 60,
                    borderWidth: 1,
                    borderColor: '#000',
                    borderRadius: 10,
                    resizeMode: 'contain',
                  }}
                />
                <Text
                  style={{
                    fontSize: item.name.length > 15 ? 10 : 12,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginTop: 5,
                  }}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }
    return rows;
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Image
          source={emergencyHotlines[0].logo}
          style={{
            width: 90,
            height: 90,
            resizeMode: 'contain',
          }}
        />
        <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginTop: 5 }}>
          {emergencyHotlines[0].name}
        </Text>
      </View>

      <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>
        OLONGAPO CPO
      </Text>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Image
          source={require('./assets/OCPO.png')}
          style={{
            width: 100,
            height: 100,
            resizeMode: 'contain',
          }}
        />
      </View>

      <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>
        POLICE STATIONS
      </Text>
      {renderGrid(policeStations)}

      <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, marginTop: 20 }}>
        OTHER EMERGENCY HOTLINES
      </Text>
      {renderGrid(otherHotlines)}

      <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, marginTop: 20 }}>
        BARANGAY’S
      </Text>
      {renderGrid(barangays)}

      <View style={{ marginTop: 40, paddingBottom: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>
          © 2025 Olongapo City Police Hotline App. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}

function ServicesScreen() {
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const submitFeedback = async () => {
    const ratingNumber = parseInt(rating);
    if (isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      alert('Please enter a valid rating between 1 and 5.');
      return;
    }

    if (!comment.trim()) {
      alert('Please enter your comment or suggestion.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('entry.1309731542', rating);
      formData.append('entry.17557046', comment);

      await fetch('https://docs.google.com/forms/d/e/1FAIpQLSdoJqDVaQNQxx_L4dl4cTFNB2tLWA2L2oNpI7s5yLR5sDJ4Fw/formResponse', {
        method: 'POST',
        body: formData,
      });

      setRating('');
      setComment('');
      setModalVisible(false);
      alert('Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Connection lost. Please check your internet and try again.');
    }
  };

  const stations = [
    { name: 'Philippine National Police', image: require('./assets/pnp.png'), link: 'https://www.facebook.com/pnp.pio ' },
    { name: 'Police Regional Office 3', image: require('./assets/pro33.png'), link: 'https://www.facebook.com/PoliceRegionalOffice3/ ' },
    { name: 'Olongapo City\nPolice Office', image: require('./assets/ocpopage.png'), link: 'https://www.facebook.com/pulisgapo' },
    { name: 'Olongapo CMFC', image: require('./assets/cmfc.png'), link: 'https://www.facebook.com/olongapo.cmfc.3/' },
    { name: 'Police Station 1', image: require('./assets/uno.png'), link: 'https://www.facebook.com/share/173Vcn7enb/' },
    { name: 'Police Station 2', image: require('./assets/dospage.png'), link: 'https://www.facebook.com/share/16aC2ceuto/' },
    { name: 'Police Station 3', image: require('./assets/tres.png'), link: 'https://www.facebook.com/share/1Aizuy6hcu/' },
    { name: 'Police Station 4', image: require('./assets/kwatro.png'), link: 'https://www.facebook.com/share/1HxyfdxCjc/' },
    { name: 'Police Station 5', image: require('./assets/singko.png'), link: 'https://www.facebook.com/share/16b9pj5FXS/' },
    { name: 'Police Station 6', image: require('./assets/sais.png'), link: 'https://www.facebook.com/share/16ZZr1bi7s/' },
  ];

  const services = [
    { name: 'National Police\nClearance', image: require('./assets/npc.png'), link: 'https://pnpclearance.ph' },
    { name: 'LTOPF', image: require('./assets/LTOPF.png'), link: 'https://feo.pnp-csg.org/' },
    { name: 'SOSIA', image: require('./assets/SOSIA.png'), link: 'https://sosia.pnp-csg.org/' },
    { name: 'CSWDO\nOlongapo', image: require('./assets/dswd.png'), link: 'https://www.dswd.gov.ph/dswd-satellite-office/' },
    { name: 'Olongapo\nCity Hall', image: require('./assets/ocpopage1.png'), link: 'https://www.facebook.com/groups/117277545012392/' },
    { name: 'Olongapo City Information Center', image: require('./assets/ocic1.png'), link: 'https://www.facebook.com/olongapopublicaffairs/ ' },
  ];

  const reportItems = [
    { name: 'Sumbong Nyo\nAksyon Agad', image: require('./assets/snaa.png'), link: 'https://www.facebook.com/RektangKonekAksyonAgad/' },
    { name: 'WCPCD', image: require('./assets/wcpc.png'), link: 'https://www.facebook.com/share/1Aw1teNrn6/' },
  ];

  const renderGrid = (data, columns = 3) => {
    const rows = [];
    for (let i = 0; i < data.length; i += columns) {
      const rowItems = data.slice(i, i + columns);
      while (rowItems.length < columns) {
        rowItems.push(null);
      }
      rows.push(rowItems);
    }

    return rows.map((row, idx) => (
      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 15 }}>
        {row.map((item, index) =>
          item ? (
            <TouchableOpacity
              key={index}
              onPress={() => Linking.openURL(item.link)}
              style={{ alignItems: 'center', flex: 1 }}
            >
              <Image
                source={item.image}
                style={{
                  width: 70,
                  height: 70,
                  marginBottom: 5,
                  borderWidth: 1,
                  borderColor: '#000',
                  borderRadius: 10,
                }}
              />
              <Text style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>{item.name}</Text>
            </TouchableOpacity>
          ) : (
            <View key={index} style={{ flex: 1 }} />
          )
        )}
      </View>
    ));
  };

  return (
    <ScrollView
      style={{ flex: 1, paddingHorizontal: 20, paddingTop: -5 }}
      contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
    >
      <View style={{ width: '100%', height: 180, borderRadius: 10, overflow: 'hidden', marginBottom: 5 }}>
        <Image
          source={require('./assets/services.png')}
          style={{ width: '105%', height: '105%', resizeMode: 'contain' }}
        />
      </View>

      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Report</Text>
      {renderGrid(reportItems, 3)}

      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Services</Text>
      {renderGrid(services, 3)}

      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 20 }}>Pages</Text>
      {renderGrid(stations, 3)}

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          backgroundColor: '#0d6efd',
          paddingVertical: 10,
          borderRadius: 8,
          marginTop: 100,
          marginBottom: -50,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Give Feedback</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={serviceStyles.modalOverlay}>
          <View style={serviceStyles.feedbackModal}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Submit Feedback</Text>

              <Text style={{ fontSize: 14 }}>Rate the App (1 to 5):</Text>
              <TextInput
                value={rating}
                onChangeText={setRating}
                keyboardType="numeric"
                style={serviceStyles.input}
              />

              <Text style={{ fontSize: 14, marginTop: 15 }}>Your Suggestion:</Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                multiline
                style={[serviceStyles.input, { height: 100, textAlignVertical: 'top' }]}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 }}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={[serviceStyles.button, { backgroundColor: 'gray' }]}
                >
                  <Text style={serviceStyles.buttonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={submitFeedback}
                  style={[serviceStyles.button, { backgroundColor: '#0d6efd' }]}
                >
                  <Text style={serviceStyles.buttonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const serviceStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
  },
  input: {
    borderColor: 'gray',
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
    borderRadius: 6,
  },
  button: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

function QRScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.qrCard}>
        <QRCode
          value="https://expo.dev/accounts/justinvillaflores/projects/ocpo_app_rn/builds/de1293c0-b165-4c18-8d6f-0262d301e1c1"
          size={200}
          color="#0d6efd"
        />
      </View>

      <TouchableOpacity style={styles.scanButton}>
        <Text style={styles.scanButtonText}>SCAN QR CODE</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [showNotice, setShowNotice] = useState(true);

  const handleAgree = () => {
    setShowNotice(false);
  };

  return (
    <>
      <Modal visible={showNotice} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Notice to the Public!</Text>
              <Text style={styles.modalText}>
                Welcome to the <Text style={styles.bold}>Olongapo City Hotlines</Text>, the official mobile
                application of the Olongapo City Police Office. Before using the app, please read
                the following disclaimer carefully:
              </Text>

              <Text style={styles.modalText}>
                1. <Text style={styles.bold}>General Information:</Text> The Olongapo City Hotlines is intended
                to provide residents with access to police hotlines and basic services. While
                efforts are made to keep the information updated, we do not guarantee full accuracy
                or completeness.
              </Text>

              <Text style={styles.modalText}>
                2. <Text style={styles.bold}>Service Limitations:</Text> Some services may be unavailable due
                to internet issues or third-party changes. Features may change without notice.
              </Text>

              <Text style={styles.modalText}>
                3. <Text style={styles.bold}>Third-Party Content:</Text> External links provided by the app
                are not controlled by us. Please review their privacy policies before using them.
              </Text>

              <Text style={styles.modalText}>
                4. <Text style={styles.bold}>Emergencies:</Text> This app does not replace emergency hotlines.
                For urgent help, call official emergency numbers directly.
              </Text>

              <Text style={styles.modalText}>
                5. <Text style={styles.bold}>Data Privacy:</Text> We follow applicable data privacy laws. No
                personal information is collected without your consent.
              </Text>

              <Text style={styles.acceptText}>
                By tapping “I AGREE”, you confirm that you have read, understood, and accepted the
                disclaimer. If you do not agree, please close the app.
              </Text>

              <TouchableOpacity style={styles.agreeButton} onPress={handleAgree}>
                <Text style={styles.agreeText}>I agree</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {!showNotice && (
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{ headerShown: false }}
            tabBar={(props) => <CustomTabBar {...props} />}
          >
            <Tab.Screen name="Directory" component={DirectoryScreen} />
            <Tab.Screen name="Services" component={ServicesScreen} />
            <Tab.Screen name="QR Code" component={QRScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      )}

    </>
  );
}

const styles = StyleSheet.create({
  container: {
      flex: 1,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
    },
    qrCard: {
      backgroundColor: '#fff',
      padding: 20,
      borderRadius: 12,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
    },
    scanButton: {
      marginTop: 30,
      backgroundColor: '#d4f0f7',
      paddingVertical: 10,
      paddingHorizontal: 30,
      borderRadius: 6,
    },
    scanButtonText: {
      color: '#0d6efd',
      fontWeight: 'bold',
      fontSize: 14,
    },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '85%',
    maxHeight: '85%',
    padding: 20,
  },
  modalContent: {
    flexGrow: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'left',
  },
  modalText: {
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'justify',
  },
  bold: {
    fontWeight: 'bold',
  },
  acceptText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 20,
    textAlign: 'justify',
  },
  agreeButton: {
    backgroundColor: '#0d6efd',
    alignSelf: 'flex-end',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 10,
  },
  agreeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
