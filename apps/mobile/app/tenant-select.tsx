import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { useTenant, Tenant } from '../lib/tenant-context';
import { tenantsApi } from '../lib/api';
import { Colors, Spacing, BorderRadius, FontSize } from '../lib/theme';

// Demo businesses are ONLY used as a dev-time fallback when the API is
// unreachable. In production (__DEV__ === false) we never show fake tenants —
// live users must only ever see real businesses returned by the API.
const DEMO_TENANTS = __DEV__
  ? [
      { id: 'demo-fitness', name: 'FitZone Pro', subdomain: 'fitnessapp', domainCode: 'FITNESS_CENTER', icon: '💪', primaryColor: '#FF6B35' },
      { id: 'demo-salon', name: 'Beauty World Salon', subdomain: 'kavrelicafe', domainCode: 'SALON_AND_SPA', icon: '💇', primaryColor: '#A855F7' },
      { id: 'demo-school', name: 'Edu Smart Academy', subdomain: 'edu-smart-demo', domainCode: 'SCHOOL_AND_EDUCATION', icon: '📚', primaryColor: '#2563EB' },
      { id: 'demo-restaurant', name: 'Foodie Hub Cafe', subdomain: 'foodie-demo', domainCode: 'RESTAURANT_AND_CAFE', icon: '🍕', primaryColor: '#DC2626' },
    ]
  : [];

export default function TenantSelectScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { setTenant } = useTenant();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadTenants();
    } else {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  async function loadTenants() {
    setLoading(true);
    try {
      // Try the authenticated endpoint first - returns the user's tenants
      let res = await tenantsApi.myTenants();
      let list: any[] = [];
      if (res.data) {
        const payload: any = res.data;
        list = Array.isArray(payload) ? payload : (payload?.data ?? []);
        console.log('[tenant-select] myTenants returned', list.length, 'tenants');
      }
      // If the user has no tenant, fall back to the PUBLIC search endpoint.
      // (tenantsApi.list hits /tenants which is PlatformAdmin-only → 403 for
      // members, which is why real businesses never appeared before.)
      if (list.length === 0) {
        const r2 = await tenantsApi.publicSearch('', 50);
        if (r2.data) {
          const payload: any = r2.data;
          list = Array.isArray(payload) ? payload : (payload?.data ?? []);
          console.log('[tenant-select] public search returned', list.length, 'tenants');
        }
      }
      if (list.length === 0) {
        // Last resort: demo tenants (only when the API is truly unreachable)
        list = DEMO_TENANTS as any;
      }
      setTenants(list);
    } catch (e) {
      console.error('[tenant-select] loadTenants failed', e);
      setTenants(DEMO_TENANTS as any);
    }
    setLoading(false);
  }

  async function pickTenant(tenant: Tenant) {
    setSelectedTenant(tenant);
    // Fetch the full tenant details to get branding
    const res = await tenantsApi.getBySubdomain(tenant.subdomain);
    if (res.data && !res.error) {
      const enrichedTenant: Tenant = {
        ...tenant,
        ...res.data,
        // Load brand from localStorage if exists
        logo: tenant.logo,
        primaryColor: tenant.primaryColor || res.data.settings?.branding?.primaryColor || '#4f46e5',
        siteTitle: res.data.name,
        domainCode: res.data.settings?.theme || tenant.domainCode,
      };
      // Try to load brand from localStorage (saved by builder)
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AsyncStorage = require('@react-native-async-storage/async-storage').default
        const saved = await AsyncStorage.getItem(`tenant-brand-${tenant.subdomain}`)
        if (saved) {
          const brand = JSON.parse(saved)
          enrichedTenant.logo = brand.logo || enrichedTenant.logo
          enrichedTenant.primaryColor = brand.primaryColor || enrichedTenant.primaryColor
          enrichedTenant.favicon = brand.favicon
          enrichedTenant.siteTitle = brand.siteTitle || enrichedTenant.siteTitle
          enrichedTenant.tagline = brand.tagline
        }
      } catch {}
      await setTenant(enrichedTenant)
    } else {
      await setTenant(tenant)
    }
    router.replace('/(tabs)')
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadTenants()
    setRefreshing(false)
  }

  function handleLogout() {
    logout()
    router.replace('/(auth)/login')
  }

  const filtered = tenants.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome, {user?.firstName || 'there'}! 👋</Text>
          <Text style={styles.subtitle}>Select a business to access</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search businesses…"
          placeholderTextColor={Colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              {filtered.length} business{filtered.length !== 1 ? 'es' : ''} available
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.tenantCard}
              onPress={() => pickTenant(item)}
            >
              <View
                style={[
                  styles.tenantIcon,
                  { backgroundColor: item.primaryColor || Colors.primary },
                ]}
              >
                {item.logo ? (
                  <Image source={{ uri: item.logo }} style={styles.tenantLogo} />
                ) : (
                  <Text style={styles.tenantIconText}>
                    {item.icon || item.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.tenantInfo}>
                <Text style={styles.tenantName}>{item.name}</Text>
                <Text style={styles.tenantSubdomain}>
                  {item.subdomain}.dexo.app
                </Text>
                {item.domainCode && (
                  <View style={styles.industryBadge}>
                    <Text style={styles.industryText}>
                      {item.domainCode.replace(/_/g, ' ')}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>No businesses available</Text>
              <Text style={styles.emptySubtext}>
                Contact your administrator to get access
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  greeting: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  logoutBtn: { padding: Spacing.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: Colors.text, marginLeft: Spacing.sm },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  listHeader: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  tenantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tenantIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantLogo: { width: 56, height: 56, borderRadius: BorderRadius.md },
  tenantIconText: { fontSize: 28, color: Colors.white, fontWeight: 'bold' },
  tenantInfo: { flex: 1, marginLeft: Spacing.md },
  tenantName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  tenantSubdomain: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  industryBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary + '15', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, marginTop: 4 },
  industryText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.md },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textLight, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
})
