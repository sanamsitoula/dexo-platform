import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { useTenant } from '../../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize } from '../../lib/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { tenant, clearTenant } = useTenant();
  const primaryColor = tenant?.primaryColor || Colors.primary;

  function handleSwitchTenant() {
    clearTenant();
    router.replace('/tenant-select');
  }

  function handleLogout() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: primaryColor }]}>
        {tenant?.logo ? (
          <Image source={{ uri: tenant.logo }} style={styles.tenantLogo} />
        ) : (
          <View style={styles.tenantLogoPlaceholder}>
            <Text style={styles.tenantLogoText}>
              {(tenant?.name || 'D').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.tenantName}>{tenant?.name || 'Dexo'}</Text>
        {tenant?.tagline && <Text style={styles.tagline}>{tenant.tagline}</Text>}
      </View>

      {/* User Card */}
      <View style={styles.userCard}>
        <View style={[styles.avatar, { backgroundColor: primaryColor }]}>
          <Text style={styles.avatarText}>
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Account</Text>
        <MenuItem
          icon="person-outline"
          label="Edit Profile"
          onPress={() => Alert.alert('Coming soon', 'Profile editing coming soon')}
        />
        <MenuItem
          icon="notifications-outline"
          label="Notifications"
          onPress={() => router.push('/(tabs)/notifications')}
        />
        <MenuItem
          icon="settings-outline"
          label="Settings"
          onPress={() => Alert.alert('Coming soon', 'Settings coming soon')}
        />
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Business</Text>
        <MenuItem
          icon="business-outline"
          label="Switch Business"
          sublabel={tenant?.name}
          onPress={handleSwitchTenant}
        />
        {tenant?.subdomain && (
          <MenuItem
            icon="globe-outline"
            label="Website"
            sublabel={`${tenant.subdomain}.dexo.app`}
            onPress={() => Alert.alert('Opening', `${tenant.subdomain}.dexo.app`)}
          />
        )}
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Support</Text>
        <MenuItem
          icon="help-circle-outline"
          label="Help Center"
          onPress={() => Alert.alert('Help', 'Contact support@dexo.app')}
        />
        <MenuItem
          icon="document-text-outline"
          label="Terms of Service"
          onPress={() => Alert.alert('Terms', 'View terms of service')}
        />
        <MenuItem
          icon="shield-checkmark-outline"
          label="Privacy Policy"
          onPress={() => Alert.alert('Privacy', 'View privacy policy')}
        />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Dexo Mobile · v1.0.0</Text>
      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

function MenuItem({ icon, label, sublabel, onPress }: any) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={20} color={Colors.textSecondary} />
        <View style={{ marginLeft: Spacing.md, flex: 1 }}>
          <Text style={styles.menuItemLabel}>{label}</Text>
          {sublabel && <Text style={styles.menuItemSublabel}>{sublabel}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  tenantLogo: { width: 72, height: 72, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, backgroundColor: Colors.white },
  tenantLogoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tenantLogoText: { fontSize: 32, fontWeight: 'bold', color: Colors.primary },
  tenantName: { color: Colors.white, fontSize: FontSize.lg, fontWeight: 'bold' },
  tagline: { color: Colors.white, fontSize: FontSize.xs, opacity: 0.85, marginTop: 2 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontSize: FontSize.md, fontWeight: 'bold' },
  userInfo: { flex: 1, marginLeft: Spacing.md },
  userName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  userEmail: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  menuSection: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xs,
  },
  menuSectionTitle: { fontSize: FontSize.xs, color: Colors.textSecondary, textTransform: 'uppercase', fontWeight: '600', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xs, letterSpacing: 1 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuItemLabel: { fontSize: FontSize.md, color: Colors.text },
  menuItemSublabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  logoutText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textLight, marginTop: Spacing.md },
});
