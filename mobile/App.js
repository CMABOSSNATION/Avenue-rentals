// mobile/App.js
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuthStore } from './src/store';
import { connectSocket, disconnectSocket } from './src/services/socket';

// Onboarding
import SplashScreen from './src/screens/onboarding/SplashScreen';
import WelcomeScreen from './src/screens/onboarding/WelcomeScreen';
import PhoneScreen from './src/screens/onboarding/PhoneScreen';
import OTPScreen from './src/screens/onboarding/OTPScreen';
import ProfileSetupScreen from './src/screens/onboarding/ProfileSetupScreen';

// Shared
import PropertyDetailScreen from './src/screens/shared/PropertyDetailScreen';
import ChatScreen from './src/screens/shared/ChatScreen';
import ReviewScreen from './src/screens/shared/ReviewScreen';
import UserProfileScreen from './src/screens/shared/UserProfileScreen';

// Tenant
import SearchScreen from './src/screens/tenant/SearchScreen';
import SavedScreen from './src/screens/tenant/SavedScreen';
import InquiriesListScreen from './src/screens/tenant/InquiriesListScreen';
import DealsScreen from './src/screens/tenant/DealsScreen';
import TenantProfileScreen from './src/screens/tenant/TenantProfileScreen';
import InquiryScreen from './src/screens/tenant/InquiryScreen';

// Landlord
import MyListingsScreen from './src/screens/landlord/MyListingsScreen';
import AddPropertyScreen from './src/screens/landlord/AddPropertyScreen';
import LandlordInquiriesScreen from './src/screens/landlord/LandlordInquiriesScreen';
import LandlordDealsScreen from './src/screens/landlord/LandlordDealsScreen';
import CreateDealScreen from './src/screens/landlord/CreateDealScreen';
import LandlordProfileScreen from './src/screens/landlord/LandlordProfileScreen';
import EarningsScreen from './src/screens/landlord/EarningsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#1B5E20',    // Deep green
  secondary: '#F9A825',  // Uganda gold
  bg: '#FAFAFA',
  text: '#1A1A1A',
};

// ─── Tenant Tab Navigator ─────────────────────────────────────
function TenantTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Search: 'magnify',
            Saved: 'heart-outline',
            Chats: 'chat-outline',
            Deals: 'handshake-outline',
            Profile: 'account-outline',
          };
          return <Icon name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarLabel: 'Search' }} />
      <Tab.Screen name="Saved" component={SavedScreen} options={{ tabBarLabel: 'Saved' }} />
      <Tab.Screen name="Chats" component={InquiriesListScreen} options={{ tabBarLabel: 'Chats' }} />
      <Tab.Screen name="Deals" component={DealsScreen} options={{ tabBarLabel: 'Deals' }} />
      <Tab.Screen name="Profile" component={TenantProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ─── Landlord Tab Navigator ───────────────────────────────────
function LandlordTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Listings: 'home-city-outline',
            Inquiries: 'email-outline',
            LandlordDeals: 'handshake-outline',
            Earnings: 'cash-multiple',
            LandlordProfile: 'account-outline',
          };
          return <Icon name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Listings" component={MyListingsScreen} options={{ tabBarLabel: 'My Listings' }} />
      <Tab.Screen name="Inquiries" component={LandlordInquiriesScreen} options={{ tabBarLabel: 'Inquiries' }} />
      <Tab.Screen name="LandlordDeals" component={LandlordDealsScreen} options={{ tabBarLabel: 'Deals' }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} options={{ tabBarLabel: 'Earnings' }} />
      <Tab.Screen name="LandlordProfile" component={LandlordProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────
export default function App() {
  const { user, token, loadUser, isLoading } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (token) {
      connectSocket(token);
    } else {
      disconnectSocket();
    }
  }, [token]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
              // Auth flow
              <>
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Phone" component={PhoneScreen} />
                <Stack.Screen name="OTP" component={OTPScreen} />
                <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
              </>
            ) : (
              // Main app
              <>
                <Stack.Screen
                  name="Main"
                  component={user.role === 'tenant' ? TenantTabs : LandlordTabs}
                />
                {/* Shared screens accessible from both roles */}
                <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen}
                  options={{ headerShown: true, headerTitle: '', headerBackTitle: 'Back',
                    headerStyle: { backgroundColor: COLORS.primary },
                    headerTintColor: '#fff' }} />
                <Stack.Screen name="Chat" component={ChatScreen}
                  options={{ headerShown: true, headerStyle: { backgroundColor: COLORS.primary },
                    headerTintColor: '#fff' }} />
                <Stack.Screen name="Review" component={ReviewScreen}
                  options={{ headerShown: true, headerTitle: 'Leave Review',
                    headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: '#fff' }} />
                <Stack.Screen name="UserProfile" component={UserProfileScreen}
                  options={{ headerShown: true, headerTitle: 'Profile',
                    headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: '#fff' }} />
                <Stack.Screen name="Inquiry" component={InquiryScreen}
                  options={{ headerShown: true, headerTitle: 'Send Inquiry',
                    headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: '#fff' }} />
                <Stack.Screen name="AddProperty" component={AddPropertyScreen}
                  options={{ headerShown: true, headerTitle: 'Add Property',
                    headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: '#fff' }} />
                <Stack.Screen name="CreateDeal" component={CreateDealScreen}
                  options={{ headerShown: true, headerTitle: 'Create Deal',
                    headerStyle: { backgroundColor: COLORS.primary }, headerTintColor: '#fff' }} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
