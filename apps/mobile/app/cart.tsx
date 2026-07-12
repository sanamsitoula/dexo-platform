import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { useTenant } from '../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../lib/theme';
import { ecommerceApi } from '../lib/api';

function firstImage(images: any): string | null {
  if (!images) return null;
  if (Array.isArray(images) && images.length > 0) return String(images[0]);
  if (typeof images === 'string') return images;
  return null;
}

export default function CartScreen() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuth();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await ecommerceApi.cart.get();
    if (res.error) setError(res.error);
    else setCart(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
    else setLoading(false);
  }, [isAuthenticated, load]);

  async function changeQty(itemId: string, quantity: number) {
    setBusyItem(itemId);
    if (quantity < 1) {
      await ecommerceApi.cart.removeItem(itemId);
    } else {
      await ecommerceApi.cart.updateItem(itemId, quantity);
    }
    await load();
    setBusyItem(null);
  }

  async function removeItem(itemId: string) {
    setBusyItem(itemId);
    await ecommerceApi.cart.removeItem(itemId);
    await load();
    setBusyItem(null);
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={48} color={Colors.textLight} />
        <Text style={styles.emptyTitle}>Sign in to view your cart</Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary }]} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryBtnText}>Sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={primary} />
      </View>
    );
  }

  const items: any[] = cart?.items ?? [];
  const subtotal = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
  const taxTotal = items.reduce((s, i) => s + (Number(i.unitPrice) * i.quantity * Number(i.product?.taxRatePercent || 0)) / 100, 0);
  const total = subtotal + taxTotal;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Your Cart</Text>
        <View style={{ width: 26 }} />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="cart-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary }]} onPress={() => router.push('/shop')}>
              <Text style={styles.primaryBtnText}>Browse shop</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const img = firstImage(item.product?.images);
          const busy = busyItem === item.id;
          return (
            <View style={styles.card}>
              {img ? (
                <Image source={{ uri: img }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Ionicons name="image-outline" size={22} color={Colors.textLight} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product?.name || 'Product'}</Text>
                <Text style={[styles.itemPrice, { color: primary }]}>${Number(item.unitPrice).toFixed(2)}</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepperBtn} disabled={busy} onPress={() => changeQty(item.id, item.quantity - 1)}>
                    <Ionicons name="remove" size={16} color={Colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{busy ? '…' : item.quantity}</Text>
                  <TouchableOpacity style={styles.stepperBtn} disabled={busy} onPress={() => changeQty(item.id, item.quantity + 1)}>
                    <Ionicons name="add" size={16} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity onPress={() => removeItem(item.id)} disabled={busy} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {items.length > 0 && (
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>${taxTotal.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 4 }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={[styles.totalValue, { color: primary }]}>${total.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: primary }]} onPress={() => router.push('/checkout')}>
            <Text style={styles.checkoutText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, padding: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },

  errorBox: { backgroundColor: Colors.errorBg, marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  errorText: { color: Colors.error, fontWeight: '600' },

  list: { padding: Spacing.lg, paddingTop: 0, flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl2, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.sm },
  thumb: { width: 64, height: 64, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceAlt },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  itemPrice: { fontSize: FontSize.sm, fontWeight: '800', marginTop: 2 },

  stepper: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.full, alignSelf: 'flex-start' },
  stepperBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { minWidth: 20, textAlign: 'center', fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },

  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  primaryBtn: { borderRadius: BorderRadius.full, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

  summary: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  summaryLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  summaryValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  totalLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: '800' },
  totalValue: { fontSize: FontSize.md, fontWeight: '800' },
  checkoutBtn: { borderRadius: BorderRadius.full, paddingVertical: Spacing.md + 2, alignItems: 'center', marginTop: Spacing.md },
  checkoutText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
});
