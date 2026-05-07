import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CustomTabBar({ state, descriptors, navigation }) {

  const order = {
    'Directory': 0,
    'Services': 1,
    'Messages': 2,
    'Announce': 3,
    'Profile': 4
  };

  const reorderedRoutes = [...state.routes].sort(
    (a, b) => order[a.name] - order[b.name]
  );

  return (
    <View style={styles.tabBar}>
      {reorderedRoutes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? route.name;

        const isFocused =
          state.index === state.routes.findIndex(r => r.key === route.key);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const getIcon = () => {
          switch (route.name) {
            case 'Directory': return isFocused ? 'call' : 'call-outline';
            case 'Services': return isFocused ? 'document-text' : 'document-text-outline';
            case 'Messages': return isFocused ? 'chatbubble' : 'chatbubble-outline';
            case 'Announce': return isFocused ? 'megaphone' : 'megaphone-outline';
            case 'Profile': return isFocused ? 'person' : 'person-outline';
            default: return 'help-outline';
          }
        };

        return (
          <TouchableOpacity key={index} onPress={onPress} style={styles.tab}>
            <Ionicons
              name={getIcon()}
              size={24}
              color={isFocused ? '#0d6efd' : '#8e8e93'}
            />
            <Text style={[
              styles.label,
              { color: isFocused ? '#0d6efd' : '#8e8e93' }
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 75,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 20,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
});