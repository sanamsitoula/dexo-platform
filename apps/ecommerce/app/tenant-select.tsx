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
import { useAuth } from '@dexo/mobile-core/lib/auth-context';
import { useTenant, Tenant } from '@dexo/mobile-core/lib/tenant-context';
import { tenantsApi } from '@dexo/mobile-core/lib/api';
import { storage } from '@dexo/mobile-core/lib/storage';
import { Colors, Spacing, BorderRadius, FontSize } from '@dexo/mobile-core/lib/theme';

const FAVORITES_KEY = 'favoriteTenants';

/**
 * Normalize whatever the customer types into a host the API can resolve:
 *   "https://vrfitness.onedexo.com/login" -> "vrfitness.onedexo.com"
 *   "fitness.com"                          -> "fitness.com"
 *   "vrfitness"                            -> "vrfitness" (bare slug)
 */
function normalizeHostInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];
}

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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    storage.getItem(FAVORITES_KEY).then((raw) => {
      if (raw) {
        try { setFavorites(JSON.parse(raw)); } catch { /* corrupt — ignore */ }
      }
    });
  }, []);

  async function toggleFavorite(subdomain: string) {
    const next = favorites.includes(subdomain)
      ? favorites.filter((s) => s !== subdomain)
      : [...favorites, subdomain];
    setFavorites(next);
    await storage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  /** Connect by any address: custom domain, platform subdomain, or bare slug. */
  async function connectByDomain() {
    const host = normalizeHostInput(domainInput);
    if (!host) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await tenantsApi.resolveHost(host);
      if (res.data && !res.error) {
        const t: any = res.data;
        await pickTenant({
          id: t.id,
          name: t.name,
          subdomain: t.subdomain,
          domain: t.domain,
          domainCode: t.domainType,
          primaryColor: t.branding?.colorPrimary || t.branding?.primaryColor,
          logo: t.branding?.logo,
        } as Tenant);
      } else {
        setConnectError(`No business found at "${host}". Check the address and try again.`);
      }
    } catch {
      setConnectError('Could not reach the server. Check your connection.');
    } finally {
      setConnecting(false);
    }
  }

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

  const filtered = tenants
    .filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const af = favorites.includes(a.subdomain) ? 0 : 1;
      const bf = favorites.includes(b.subdomain) ? 0 : 1;
      return af - bf || a.name.localeCompare(b.name);
    })

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

      {/* Connect directly by domain — vrfitness.onedexo.com, fitness.com, or a bare slug */}
      <View style={styles.connectBox}>
        <Ionicons name="globe-outline" size={20} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="yourgym.com or name.onedexo.com"
          placeholderTextColor={Colors.textLight}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={domainInput}
          onChangeText={(v) => { setDomainInput(v); setConnectError(null); }}
          onSubmitEditing={connectByDomain}
        />
        <TouchableOpacity
          style={[styles.connectBtn, (!domainInput.trim() || connecting) && { opacity: 0.5 }]}
          onPress={connectByDomain}
          disabled={!domainInput.trim() || connecting}
        >
          {connecting
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.connectBtnText}>Connect</Text>}
        </TouchableOpacity>
      </View>
      {connectError && <Text style={styles.connectError}>{connectError}</Text>}

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
                  {item.subdomain}.onedexo.com
                </Text>
                {item.domainCode && (
                  <View style={styles.industryBadge}>
                    <Text style={styles.industryText}>
                      {item.domainCode.replace(/_/g, ' ')}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => toggleFavorite(item.subdomain)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.favoriteBtn}
              >
                <Ionicons
                  name={favorites.includes(item.subdomain) ? 'star' : 'star-outline'}
                  size={20}
                  color={favorites.includes(item.subdomain) ? '#F59E0B' : Colors.textLight}
                />
              </TouchableOpacity>
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
  connectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  connectBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  connectBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },
  connectError: { color: '#DC2626', fontSize: FontSize.xs, marginHorizontal: Spacing.lg, marginTop: -Spacing.sm, marginBottom: Spacing.sm },
  favoriteBtn: { marginRight: Spacing.sm },
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
