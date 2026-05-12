import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Linking, ActivityIndicator } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function DirectoryScreen() {
  const [hotlines, setHotlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ang onSnapshot ay gumagana kahit offline basta may cached data
    const q = query(collection(db, "hotlines"), orderBy("name", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHotlines(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const policeStations = hotlines.filter(h => h.category === 'Police');
  const barangays = hotlines.filter(h => h.category === 'Barangay');
  const otherHotlines = hotlines.filter(h => h.category === 'Other');

  const emergency911 = { name: '911', number: '911', logo: require('../assets/paynal_911.png') };
  const ocpoHotline = { name: 'Olongapo CPO', number: '09985985546', logo: require('../assets/OCPO.png') };

  const renderGrid = (data, columns = 3) => {
    const rows = [];
    for (let i = 0; i < data.length; i += columns) {
      const rowItems = data.slice(i, i + columns);
      while (rowItems.length < columns) rowItems.push(null);
      rows.push(rowItems);
    }

    return rows.map((row, idx) => (
      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 20 }}>
        {row.map((item, index) =>
          item ? (
            <TouchableOpacity
              key={item.id || index}
              onPress={() => Linking.openURL(`tel:${item.number}`)}
              style={{ alignItems: 'center', flex: 1 }}
            >
              <Image
                source={item.imageUrl ? { uri: item.imageUrl } : require('../assets/OCPO.png')}
                style={{
                  width: 70,
                  height: 70,
                  marginBottom: 5,
                  borderWidth: 1,
                  borderColor: '#000',
                  borderRadius: 10,
                  backgroundColor: '#f9f9f9'
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0047AB" />
        <Text style={{ marginTop: 10 }}>Updating Directory...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, paddingHorizontal: 20, paddingTop: 70, backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View style={{ alignItems: 'center', marginBottom: 10, marginTop: -20, }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center' }}>
          Welcome to <Text style={{ color: '#000' }}>Olongapo City Emergency Hotlines</Text>
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 14, color: '#555', textAlign: 'center' }}>
          Tap the logo to make an emergency call.
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => Linking.openURL(`tel:${emergency911.number}`)}
        style={{ alignItems: 'center', marginBottom: 20 }}
      >
        <Image source={emergency911.logo} style={{ width: 200, height: 200, marginTop: -10, resizeMode: 'contain' }} />
        <Text style={{ fontSize: 25, fontWeight: 'bold', textAlign: 'center', marginTop: -5 }}>{emergency911.name}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL(`tel:${ocpoHotline.number}`)}
        style={{ alignItems: 'center', marginBottom: 30 }}
      >
        <Image source={ocpoHotline.logo} style={{ width: 160, height: 160, resizeMode: 'contain' }} />
        <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginTop: -30 }}>{ocpoHotline.name}</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, marginTop: 20 }}>POLICE STATIONS</Text>
      {renderGrid(policeStations)}

      <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginVertical: 10, marginTop: 50, marginBottom: 30 }}>OTHER EMERGENCY HOTLINES</Text>
      {renderGrid(otherHotlines)}

      <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginVertical: 10, marginTop: 50, marginBottom: 30 }}>BARANGAYS</Text>
      {renderGrid(barangays)}

      <View style={{ marginTop: 30, marginBottom: -5, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>© 2025 Olongapo City Police Hotline App. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}