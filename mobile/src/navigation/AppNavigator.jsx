import { useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import COLORS from '../theme';
import { DrawerContext } from './DrawerContext';
import TopBar from '../components/TopBar';
import AppDrawer from '../components/AppDrawer';
import CustomTabBar from '../components/CustomTabBar';

import DashboardScreen from '../screens/DashboardScreen';
import LogActivityScreen from '../screens/LogActivityScreen';
import LogsScreen from '../screens/LogsScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import VisitCheckinScreen from '../screens/VisitCheckinScreen';
import ImportScreen from '../screens/ImportScreen';
import PerformanceScreen from '../screens/PerformanceScreen';
import LoginScreen from '../screens/LoginScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function SyncBanner() {
  const { pendingCount } = useOfflineQueue();
  if (!pendingCount) return null;
  return (
    <View style={{ backgroundColor: '#fef9c3', paddingVertical: 6, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#854d0e' }}>
        ⏳ {pendingCount} item{pendingCount === 1 ? '' : 's'} pending sync — will upload when back online
      </Text>
    </View>
  );
}

// The tab shell: one shared white TopBar + a custom bottom bar (raised In/Out
// button) + the slide-out drawer overlay, wrapping the four primary tabs.
function MainTabs({ navigation }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerCtx = useMemo(() => ({ open: () => setDrawerOpen(true), close: () => setDrawerOpen(false) }), []);

  return (
    <DrawerContext.Provider value={drawerCtx}>
      <View style={{ flex: 1, backgroundColor: COLORS.bgSlate }}>
        <SyncBanner />
        <TopBar />
        <Tab.Navigator
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="Home" component={DashboardScreen} />
          <Tab.Screen name="Logs" component={LogsScreen} />
          <Tab.Screen name="InOut" component={VisitCheckinScreen} />
          <Tab.Screen name="Projects" component={ProjectsScreen} />
        </Tab.Navigator>
        <AppDrawer visible={drawerOpen} onClose={drawerCtx.close} navigation={navigation} />
      </View>
    </DrawerContext.Provider>
  );
}

const detailHeader = (title) => ({
  headerShown: true,
  title,
  headerStyle: { backgroundColor: COLORS.navy },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
});

export default function AppNavigator({ isLoggedIn }) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="Tabs" component={MainTabs} />
            <Stack.Screen name="LogActivity" component={LogActivityScreen} options={detailHeader('Log Activity')} />
            <Stack.Screen name="Performance" component={PerformanceScreen} options={detailHeader('Performance')} />
            <Stack.Screen name="Import" component={ImportScreen} options={detailHeader('Import Data')} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
