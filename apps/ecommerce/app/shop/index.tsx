import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTenant } from '@dexo/mobile-core/lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '@dexo/mobile-core/lib/theme';
import { ecommerceApi } from '@dexo/mobile-core/lib/api';

function firstImage(images: any): string | null {
  if (!images) return null;
  if (Array.isArray(images) && images.length > 0) return String(images[0]);
  if (typeof images === 'string') return images;
  return null;
}

export default function ShopScreen() {
  const router = useRouter();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenant?.subdomain) return;
    setLoading(true);
    setError(null);
    const [p, c] = await Promise.all([
      ecommerceApi.products.list(tenant.subdomain, {
        categoryId: selectedCategory || undefined,
        q: search.trim() || undefined,
      }),
      categories.length ? Promise.resolve({ data: categories }) : ecommerceApi.categories.list(tenant.subdomain),
    ]);
    if (p.error) setError(p.error);
    setProducts(Array.isArray(p.data) ? p.data : []);
    if (Array.isArray(c.data)) setCategories(c.data);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.subdomain, selectedCategory, search]);

  useEffect(() => {
    load();
  }, [tenant?.subdomain, selectedCategory]);

  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <View style={styles.titleRow}>
          <Text style={styles.h1}>Shop</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => router.push('/shop-assistant')} style={styles.iconBtn}>
              <Ionicons name="sparkles-outline" size={22} color={primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/cart')} style={styles.iconBtn}>
              <Ionicons name="cart-outline" size={22} color={primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products"
            placeholderTextColor={Colors.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {categories.length > 0 && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: null, name: 'All' }, ...categories]}
            keyExtractor={(c: any) => c.id ?? 'all'}
            contentContainerStyle={{ gap: Spacing.sm, paddingVertical: Spacing.sm }}
            renderItem={({ item }: any) => {
              const active = selectedCategory === item.id;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedCategory(item.id)}
                  style={[styles.chip, active && { backgroundColor: primary }]}
                >
                  <Text style={[styles.chipText, active && { color: '#fff' }]}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: Spacing.md }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bag-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No products found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const img = firstImage(item.images);
            return (
              <TouchableOpacity style={styles.card} onPress={() => router.push(`/shop/${item.slug}`)}>
                {img ? (
                  <Image source={{ uri: img }} style={styles.cardImage} />
                ) : (
                  <View style={[styles.cardImage, styles.imagePlaceholder]}>
                    <Ionicons name="image-outline" size={32} color={Colors.textLight} />
                  </View>
                )}
                <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.cardPrice, { color: primary }]}>
                  ${Number(item.sellingPrice).toFixed(2)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontSize: FontSize.title, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  headerIcons: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.sm },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, marginTop: Spacing.md, ...Shadows.sm },
  searchInput: { flex: 1, paddingVertical: Spacing.sm + 2, marginLeft: Spacing.sm, color: Colors.text, fontSize: FontSize.sm },

  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceAlt },
  chipText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },

  list: { padding: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },
  card: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl2, padding: Spacing.md, ...Shadows.sm },
  cardImage: { width: '100%', height: 120, borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceAlt, marginBottom: Spacing.sm },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  cardPrice: { fontSize: FontSize.md, fontWeight: '800', marginTop: 4 },

  errorText: { color: Colors.error, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, width: '100%' },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
});
