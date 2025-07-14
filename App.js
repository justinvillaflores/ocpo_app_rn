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

const Tab = createBottomTabNavigator();

function HomeScreen() {
  const contacts = [
    { name: '911', image: require('./assets/911 logo.png'), number: '911' },
    { name: 'Police Station 1', image: require('./assets/1.png'), number: '09985985547' },
    { name: 'Police Station 2', image: require('./assets/2.png'), number: '09985985549' },
    { name: 'Police Station 3', image: require('./assets/3.png'), number: '09985985561' },
    { name: 'Police Station 4', image: require('./assets/4.png'), number: '09985985563' },
    { name: 'Police Station 5', image: require('./assets/5.png'), number: '09985985567' },
    { name: 'Police Station 6', image: require('./assets/6.png'), number: '09985985569' },
    { name: 'Olongapo City\nPolice Office', image: require('./assets/OCPO.png'), number: '09985985546' },
  ];

  const renderContact = (contact, index) => {
    const isStation = contact.name.includes('Police Station') && index >= 1 && index <= 6;

    return (
      <TouchableOpacity
        key={contact.name}
        onPress={() => Linking.openURL(`tel:${contact.number}`)}
        style={{ alignItems: 'center', flex: 1, marginVertical: 10 }}
      >
        <Image
          source={contact.image}
          style={{
            width: 70,
            height: 70,
            ...(isStation && { borderWidth: 1, borderColor: '#000', borderRadius: 10 }),
          }}
        />
        <Text style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginTop: 5 }}>
          {contact.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingTop: 100, paddingHorizontal: 20 }}>
        <Image source={require('./assets/download.png')} style={{ width: 400, height: 400, marginBottom: -50, marginTop: -120 }} />
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Welcome to Olongapo City Hotlines</Text>
        <Text style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 10 }}>Call us now for emergencies:</Text>

        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between' }}>
          {renderContact(contacts[0], 0)}
          <View style={{ flex: 1 }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${contacts[7].number}`)}
              style={{ alignItems: 'center', marginVertical: 10 }}
            >
              <Image source={contacts[7].image} style={{ width: 70, height: 70 }} />
              <Text style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginTop: 5 }}>
                {contacts[7].name}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 }}>
          {renderContact(contacts[1], 1)}
          {renderContact(contacts[2], 2)}
          {renderContact(contacts[3], 3)}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 }}>
          {renderContact(contacts[4], 4)}
          {renderContact(contacts[5], 5)}
          {renderContact(contacts[6], 6)}
        </View>
      </ScrollView>
    </View>
  );
}

function ServicesScreen() {
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const submitFeedback = async () => {
    const feedback = { rating, comment, date: new Date().toISOString() };
    let stored = await AsyncStorage.getItem('feedbacks');
    const feedbacks = stored ? JSON.parse(stored) : [];
    feedbacks.push(feedback);
    await AsyncStorage.setItem('feedbacks', JSON.stringify(feedbacks));

    if (navigator.onLine) {
      await fetch('https://yourdomain.com/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback),
      });
    }

    setRating('');
    setComment('');
    setModalVisible(false);
    alert('Thank you for your feedback boss!');
  };

  const stations = [
    { name: 'Police Station 1', image: require('./assets/1.png'), link: 'https://www.facebook.com/share/173Vcn7enb/' },
    { name: 'Police Station 2', image: require('./assets/2.png'), link: 'https://www.facebook.com/share/16aC2ceuto/' },
    { name: 'Police Station 3', image: require('./assets/3.png'), link: 'https://www.facebook.com/share/1Aizuy6hcu/' },
    { name: 'Police Station 4', image: require('./assets/4.png'), link: 'https://www.facebook.com/share/1HxyfdxCjc/' },
    { name: 'Police Station 5', image: require('./assets/5.png'), link: 'https://www.facebook.com/share/16b9pj5FXS/' },
    { name: 'Police Station 6', image: require('./assets/6.png'), link: 'https://www.facebook.com/share/16ZZr1bi7s/' },
  ];

  const services = [
    { name: 'National Police\nClearance', image: require('./assets/npc.png'), link: 'https://pnpclearance.ph' },
    { name: 'LTOPF', image: require('./assets/LTOPF.png'), link: 'https://feo.pnp-csg.org/' },
    { name: 'SOSIA', image: require('./assets/SOSIA.png'), link: 'https://sosia.pnp-csg.org/' },
  ];

  const reportItems = [
    { name: 'Sumbong Nyo\nAksyon Agad', image: require('./assets/snaa.png'), link: 'https://www.facebook.com/RektangKonekAksyonAgad/' },
    { name: 'WCPC', image: require('./assets/wcpc.png'), link: 'https://www.facebook.com/share/1Aw1teNrn6/' },
  ];

  const renderRow = (data) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
      {data.map((item, index) => (
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
      ))}
      {data.length === 2 && <View style={{ flex: 1 }} />}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}
      contentContainerStyle={{ paddingBottom: 50, flexGrow: 1 }}
    >
      <View
        style={{
          width: '100%',
          height: 180,
          borderRadius:10,
          overflow: 'hidden',
          marginBottom: 5,
        }}
      >
        <Image
          source={require('./assets/OC SERVICES.png')}
          style={{
            width: '100%',
            height: '100%',
            resizeMode: 'contain',
          }}
        />
      </View>


      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Report</Text>
      {renderRow(reportItems)}

      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Services</Text>
      {renderRow(services)}

      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 20 }}>Pages</Text>
      {renderRow(stations.slice(0, 3))}
      {renderRow(stations.slice(3, 6))}

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          backgroundColor: '#0d6efd',
          paddingVertical: 10,
          borderRadius: 8,
          marginTop: 70,
          alignItems: 'center',
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

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
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
    marginTop: 5,
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

function DirectoryScreen() {
  const barangayLogo = require('./assets/brgy.png');
  const bfpLogo = require('./assets/BFP.png');

  const stations = [
    {
      id: 1,
      name: 'Police Station 1',
      barangays: [
        { name: 'Barangay 132', number: '091234' },
        { name: 'Barangay 444', number: '09321' },
        { name: 'Barangay 000', number: '094231' },
      ],
    },
    { id: 2, name: 'Police Station 2', barangays: [] },
    { id: 3, name: 'Police Station 3', barangays: [] },
    { id: 4, name: 'Police Station 4', barangays: [] },
    { id: 5, name: 'Police Station 5', barangays: [] },
    { id: 6, name: 'Police Station 6', barangays: [] },
  ];

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 30, fontWeight: 'bold', marginBottom: 25, marginTop: 10 }}>Contacts</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
        <TouchableOpacity onPress={() => Linking.openURL('tel:09512779025')} style={{ alignItems: 'center' }}>
          <Image source={bfpLogo} style={{ width: 60, height: 60, marginLeft: 20, marginRight: 10, borderWidth: 1, borderColor: '#000', borderRadius: 10 }} />
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#000', marginTop: 5 }}>BFP</Text>
        </TouchableOpacity>
      </View>

      {stations.map((station) => (
        <View key={station.id} style={{ marginBottom: 30 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#000', marginBottom: 10 }}>{station.name}:</Text>
          {station.barangays.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {station.barangays.map((brgy, index) => (
                <TouchableOpacity key={index} onPress={() => Linking.openURL(`tel:${brgy.number}`)} style={{ width: '30%', alignItems: 'center', marginBottom: 20 }}>
                  <Image source={barangayLogo} style={{ width: 60, height: 60, borderWidth: 1, borderColor: '#000', borderRadius: 10 }} />
                  <Text style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginTop: 5 }}>{brgy.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function QRScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ marginBottom: 20 }}>Scan to Download this App</Text>
      <QRCode
        value="https://expo.dev/accounts/justinvillaflores/projects/ocpo_app_rn/builds/59c8f3a6-b0bc-4777-97c4-75eb5805dadc"
        size={200}
      />
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
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarIcon: ({ color, size }) => {
                let iconName;
                if (route.name === 'Home') iconName = 'home';
                else if (route.name === 'Services') iconName = 'document-text';
                else if (route.name === 'Directory') iconName = 'call';
                else if (route.name === 'QR Code') iconName = 'qr-code';
                return <Ionicons name={iconName} size={size} color={color} />;
              },
            })}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Services" component={ServicesScreen} />
            <Tab.Screen name="Directory" component={DirectoryScreen} />
            <Tab.Screen name="QR Code" component={QRScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
