import React, { useContext, useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // <--- REQUIRED FOR GESTURES

// Components
import AnimatedSplash from './src/components/AnimatedSplash';
import CustomTabBar from './src/components/CustomTabBar';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import CameraScreen from './src/screens/CameraScreen';
import InboxScreen from './src/screens/InboxScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import ChatScreen from './src/screens/ChatScreen'; 

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// The "Inside App" Navigation (Tabs)
function AppTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Camera" component={CameraScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
    </Tab.Navigator>
  );
}

function Navigation() {
  const { userToken, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CEFF00"/>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken == null ? (
          // No Token -> Show Login
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          // Has Token -> Show App
          <>
            <Stack.Screen name="Home" component={AppTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} /> 
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
     // Keep splash visible for 2 seconds to show off the animation
     setTimeout(() => setAppIsReady(true), 2000); 
  }, []);

  return (
    // CRITICAL: GestureHandlerRootView must wrap the entire application
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AnimatedSplash isAppReady={appIsReady}>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      </AnimatedSplash>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});