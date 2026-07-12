import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Dimensions, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTenant } from '../../lib/tenant-context';
import { useAuth } from '../../lib/auth-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../../lib/theme';
import { ecommerceApi } from '../../lib/api';

const { width } = Dimensions.get('window');

function toImageList(images: any): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images.map(String);
  if (typeof images === 'string') return [images];
  return [];
}

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { tenant } = useTenant();
  const { isAuthenticated } = useAuth();
  const primary = tenant?.primaryColor || Colors.primary;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const load = useCallback(async () => {
    if (!tenant?.subdomain || !slug) return;
    setLoading(true);
    setError(null);
    const res = await ecommerceApi.products.bySlug(tenant.subdomain, String(slug));
    if (res.error) setError(res.error);
    else setProduct(res.data);
    setLoading(false);
  }, [tenant?.subdomain, slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddToCart() {
    if (!product) return;
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    setAdding(true);
    setAdded(false);
    const res = await ecommerceApi.cart.addItem({ productId: product.id, quantity: qty });
    setAdding(false);
    if (!res.error) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } else {
      setError(res.error);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={primary} />
      </View>
    );
  }

  if (error && !product) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!product) return null;

  const images = toImageList(product.images);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/cart')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="cart-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        {images.length > 0 ? (
          <View>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={{ width, height: 280 }} resizeMode="cover" />
              )}
            />
            {images.length > 1 && (
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeImage && { backgroundColor: primary }]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.imagePlaceholder, { width, height: 280 }]}>
            <Ionicons name="image-outline" size={56} color={Colors.textLight} />
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.name}>{product.name}</Text>
          {product.category?.name && <Text style={styles.category}>{product.category.name}</Text>}
          <Text style={[styles.price, { color: primary }]}>${Number(product.sellingPrice).toFixed(2)}</Text>

          {!!product.description && <Text style={styles.description}>{product.description}</Text>}

          <View style={styles.stepperRow}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Ionicons name="remove" size={18} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{qty}</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setQty((q) => q + 1)}>
                <Ionicons name="add" size={18} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: added ? Colors.success : primary }]}
            onPress={handleAddToCart}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color="#fff" />
            ) : added ? (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Added to cart</Text>
              </>
            ) : (
              <>
                <Ionicons name="cart-outline" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Add to cart</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },

  imagePlaceholder: { backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },

  body: { padding: Spacing.lg },
  name: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  category: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, fontWeight: '600' },
  price: { fontSize: FontSize.xl, fontWeight: '800', marginTop: Spacing.sm },
  description: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginTop: Spacing.md },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xl },
  qtyLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.full, ...Shadows.sm },
  stepperBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { minWidth: 28, textAlign: 'center', fontSize: FontSize.md, fontWeight: '700', color: Colors.text },

  addBtn: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.full, paddingVertical: Spacing.md + 2, marginTop: Spacing.xl },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

  errorText: { color: Colors.error, fontWeight: '600', marginTop: Spacing.md },
});
