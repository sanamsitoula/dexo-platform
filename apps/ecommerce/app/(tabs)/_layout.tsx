import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@dexo/mobile-core/lib/auth-context';
import { useTenant } from '@dexo/mobile-core/lib/tenant-context';
import { useDomainMenus } from '@dexo/mobile-core/lib/domain-menus';
import { useDomainTheme } from '@dexo/mobile-core/lib/domain-theme';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Colors, FontSize } from '@dexo/mobile-core/lib/theme';
import { storage } from '@dexo/mobile-core/lib/storage';

export default function TabLayout() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [roleCode, setRoleCode] = useState<string>('CUSTOMER');
  const [isLoading, setIsLoading] = useState(true);

  const domainCode = tenant?.domainCode || 'ECOMMERCE';
  const primaryColor = tenant?.primaryColor || Colors.primary;

  useEffect(() => {
    loadRoleInfo();
  }, [user]);

  async function loadRoleInfo() {
    try {
      const userDataStr = await storage.getItem('user');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData.userRoles && userData.userRoles.length > 0) {
          setRoleCode(userData.userRoles[0].role?.code || 'CUSTOMER');
        } else if (userData.role) {
          setRoleCode(userData.role);
        } else {
          setRoleCode('CUSTOMER');
        }
      }
    } catch (err) {
      console.error('Failed to load role:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const { menus } = useDomainMenus(domainCode, roleCode);
  const { theme } = useDomainTheme(domainCode);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  const getIconName = (code: string): any => {
    const iconMap: Record<string, string> = {
      dashboard: 'home-outline',
      home: 'home-outline',
      workouts: 'barbell-outline',
      training: 'barbell-outline',
      diet: 'nutrition-outline',
      nutrition: 'nutrition-outline',
      progress: 'stats-chart-outline',
      members: 'people-outline',
      customers: 'people-outline',
      trainers: 'person-outline',
      portfolio: 'briefcase-outline',
      packages: 'cube-outline',
      shop: 'bag-handle-outline',
      billing: 'card-outline',
      payments: 'card-outline',
      notifications: 'notifications-outline',
      profile: 'person-outline',
      settings: 'settings-outline',
    };
    return iconMap[code?.toLowerCase()] || 'apps-outline';
  };

  // Default tabs — storefront journey: Shop / Orders / Notifications / Profile.
  const getDefaultTabs = () => {
    return [
      { code: 'shop', label: 'Shop', route: 'index' },
      { code: 'orders', label: 'Orders', route: 'orders' },
      { code: 'notifications', label: 'Notifications', route: 'notifications' },
      { code: 'profile', label: 'Profile', route: 'profile' },
    ];
  };

  const dynamicTabs = menus.length > 0 && menus.length <= 5
    ? menus.slice(0, 5).map((m: any) => ({
        code: m.code,
        label: m.label,
        route: m.code === 'dashboard' || m.code === 'home' ? 'index' : m.code,
      }))
    : getDefaultTabs();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: primaryColor,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarLabelStyle: { fontSize: FontSize.xs },
        headerStyle: { backgroundColor: primaryColor },
        headerTitleStyle: { color: Colors.white, fontWeight: '600' },
        headerTitle: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: Colors.white, fontSize: FontSize.lg, fontWeight: '600' }}>
              {tenant?.name || 'Dexo'}
            </Text>
            <Text style={{ color: Colors.white, fontSize: FontSize.xs, marginLeft: 8, opacity: 0.8 }}>
              · {roleCode}
            </Text>
          </View>
        ),
      }}
    >
      {dynamicTabs.map((tab) => (
        <Tabs.Screen
          key={tab.code}
          name={tab.route}
          options={{
            title: tab.label,
            // Home has its own greeting hero — hide the default app bar there.
            headerShown: tab.route !== 'index',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={getIconName(tab.code)} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
