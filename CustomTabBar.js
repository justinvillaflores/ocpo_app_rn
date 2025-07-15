import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? route.name;
        const isFocused = state.index === index;

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

        const iconName =
          route.name === 'Home'
            ? 'home'
            : route.name === 'Services'
            ? 'document-text'
            : route.name === 'Directory'
            ? 'call'
            : 'qr-code';

        return (
          <TouchableOpacity key={index} onPress={onPress} style={styles.tab}>
            <View style={styles.iconWrapper}>
              <View
                style={[
                  styles.iconCircle,
                  isFocused && styles.activeIconCircle,
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={24}
                  color={isFocused ? '#0d6efd' : '#ccc'}
                />
              </View>
              <Text
                style={{
                  color: isFocused ? '#0d6efd' : '#ccc',
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 70,
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  activeIconCircle: {
    marginTop: -25,
    elevation: 10,
    shadowColor: '#0d6efd',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
  },
});
