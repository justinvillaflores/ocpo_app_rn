import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Image, Linking, TextInput, ActivityIndicator } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function ServicesScreen() {
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [warningVisible, setWarningVisible] = useState(false);

  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "hotlines"), orderBy("name", "asc"));

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllData(data);

      const fromCache = snapshot.metadata.fromCache;
      setIsOffline(fromCache);

      setLoading(false);

      console.log("Services loaded from:", fromCache ? "Local Cache (Offline)" : "Server");
    }, (error) => {
      console.error("Firebase Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const reportItems = allData.filter(item => item.category === 'Report');
  const servicesItems = allData.filter(item => item.category === 'Services');
  const pagesItems = allData.filter(item => item.category === 'Pages');
  const otherPagesItems = allData.filter(item => item.category === 'Other Pages');
  const cctvItems = allData.filter(item => item.category === 'Olongapo City CCTV Live Stream One');

  const badWords = ['putangina', 'puta', 'gago', 'tanga', 'bobo', 'ulol', 'leche', 'pakyu', 'siraulo', 'ggo', 'b0b0', 't4ngina', 'put4ngina', 'put4', 'pakyu', 'bcbc', 'bwisit', 'ul*l', 'bugok', 'bisakol', 'amp', 'nigger', 'bakal', 'yawa', 'putang ina', '8080', 'lawrence'];
  const hasBadWords = (text) => {
    const normalized = text.toLowerCase().replace(/4/g, 'a').replace(/@/g, 'a').replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/\*/g, '').replace(/ /g, '');
    return badWords.some(bad => normalized.includes(bad));
  };

  const submitFeedback = async () => {
    const ratingNumber = parseInt(rating);
    if (isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) return alert('Please enter a valid rating between 1 and 5.');
    if (!comment.trim()) return alert('Please enter your comment or suggestion.');
    if (hasBadWords(comment)) return setWarningVisible(true);

    try {
      const formData = new FormData();
      formData.append('entry.1309731542', rating);
      formData.append('entry.17557046', comment);
      await fetch('https://docs.google.com/forms/e/1FAIpQLSdoJqDVaQNQxx_L4dl4cTFNB2tLWA2L2oNpI7s5yLR5sDJ4Fw/formResponse', { method: 'POST', body: formData });
      setRating(''); setComment(''); setModalVisible(false);
      alert('Thank you for your feedback!');
    } catch (error) {
      alert('Feedback requires internet connection. Please try again later.');
    }
  };

  const renderGrid = (data, columns = 3) => {
    const rows = [];
    for (let i = 0; i < data.length; i += columns) {
      const rowItems = data.slice(i, i + columns);
      while (rowItems.length < columns) rowItems.push(null);
      rows.push(rowItems);
    }
    return rows.map((row, idx) => (
      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 15 }}>
        {row.map((item, index) =>
          item ? (
            <TouchableOpacity key={item.id || index} onPress={() => Linking.openURL(item.number)} style={{ alignItems: 'center', flex: 1 }}>
              <Image
                source={item.imageUrl ? { uri: item.imageUrl } : require('../assets/pnp.png')}
                style={[
                  { width: 70, height: 70, marginBottom: 5, borderWidth: 1, borderColor: '#000', borderRadius: 10 },
                  item.category === 'Olongapo City CCTV Live Stream One' && { width: 150, height: 150, borderRadius: 15, marginLeft: 230 }
                ]}
              />
              <Text style={item.category === 'Olongapo City CCTV Live Stream One' ? { fontSize: 14, fontWeight: 'bold', marginLeft: 280, width: 150 } : { fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ) : <View key={index} style={{ flex: 1 }} />
        )}
      </View>
    ));
  };

  if (loading) {
    return <View style={{flex:1, justifyContent:'center', backgroundColor: '#fff'}}><ActivityIndicator size="large" color="#0047AB" /><Text style={{textAlign:'center', marginTop:10}}>Loading Services...</Text></View>;
  }

  return (
    <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 5, backgroundColor: '#fff' }} contentContainerStyle={{ paddingBottom: 100 }}>

      {isOffline && (
        <View style={{ backgroundColor: '#6c757d', padding: 5, borderRadius: 5, marginTop: 10 }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontSize: 10, fontWeight: 'bold' }}>OFFLINE MODE - CACHED DATA</Text>
        </View>
      )}

      <View style={{ width: '100%', height: 180, borderRadius: 10, overflow: 'hidden', marginBottom: 5 }}>
        <Image source={require('../assets/ocposervices.png')} style={{ width: '105%', height: '105%', resizeMode: 'contain' }} />
      </View>

      {reportItems.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Report</Text>
          {renderGrid(reportItems)}
        </>
      )}

      {servicesItems.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Services</Text>
          {renderGrid(servicesItems)}
        </>
      )}

      {pagesItems.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pages</Text>
          {renderGrid(pagesItems)}
        </>
      )}

      {otherPagesItems.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Other Pages</Text>
          {renderGrid(otherPagesItems)}
        </>
      )}

      {cctvItems.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Olongapo City CCTV Live Stream One</Text>
          {renderGrid(cctvItems)}
        </>
      )}

      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.feedbackBtn}>
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Give Feedback</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={serviceStyles.modalOverlay}><View style={serviceStyles.feedbackModal}><ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Submit Feedback</Text>
          <Text style={{ fontSize: 14 }}>Rate the App (1 to 5):</Text>
          <TextInput value={rating} onChangeText={setRating} keyboardType="numeric" style={serviceStyles.input} placeholder="e.g. 5" />
          <Text style={{ fontSize: 14, marginTop: 15 }}>Your Suggestion:</Text>
          <TextInput value={comment} onChangeText={setComment} multiline style={[serviceStyles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Tell us what you think..." />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 }}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={[serviceStyles.button, { backgroundColor: 'gray' }]}><Text style={serviceStyles.buttonText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={submitFeedback} style={[serviceStyles.button, { backgroundColor: '#0d6efd' }]}><Text style={serviceStyles.buttonText}>Submit</Text></TouchableOpacity>
          </View>
        </ScrollView></View></View>
      </Modal>

      <Modal visible={warningVisible} animationType="fade" transparent={true}>
        <View style={serviceStyles.modalOverlay}><View style={[serviceStyles.feedbackModal, { padding: 20, alignItems: 'center' }]}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'red', marginBottom: 10 }}>System Breach Detected!</Text>
          <Text style={{ fontSize: 14, textAlign: 'center', marginBottom: 15 }}>Unauthorized keywords detected...</Text>
          <TouchableOpacity onPress={() => setWarningVisible(false)} style={[serviceStyles.button, { backgroundColor: '#dc3545' }]}><Text style={serviceStyles.buttonText}>Dismiss Warning</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 20, marginTop: 20 },
  feedbackBtn: { backgroundColor: '#0d6efd', paddingVertical: 12, borderRadius: 8, marginTop: 80, marginBottom: 20, alignItems: 'center' }
});

const serviceStyles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  feedbackModal: { backgroundColor: '#fff', borderRadius: 15, width: '90%', maxHeight: '80%' },
  input: { borderColor: '#ddd', borderWidth: 1, padding: 10, marginTop: 10, borderRadius: 6 },
  button: { paddingHorizontal: 25, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});