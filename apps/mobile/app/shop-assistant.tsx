import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTenant } from '../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../lib/theme';
import { aiApi } from '../lib/api';

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'What products do you have on sale?',
  'Help me find a gift under $50',
  "What's the status of my last order?",
  'Recommend something for a beginner',
];

export default function ShopAssistantScreen() {
  const router = useRouter();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function send(message: string) {
    const text = message.trim();
    if (!text || loading) return;
    setInput('');
    setError(null);
    setTurns((t) => [...t, { role: 'user', text }]);
    setLoading(true);
    const res = await aiApi.chat(text);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setTurns((t) => [...t, { role: 'assistant', text: res.data?.reply || "Sorry, I didn't catch that." }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>Shop Assistant</Text>
          <Text style={styles.subtitle}>Here to help you find what you need</Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {turns.length === 0 && (
          <View style={{ gap: Spacing.sm }}>
            <Text style={styles.welcome}>Hi! Ask me anything about our products, an order, or get a recommendation.</Text>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={styles.suggestion} onPress={() => send(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {turns.map((t, i) => (
          <View key={i} style={[styles.bubbleRow, t.role === 'user' ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
            <View style={[styles.bubble, t.role === 'user' ? { backgroundColor: primary } : { backgroundColor: Colors.surfaceAlt }]}>
              <Text style={[styles.bubbleText, t.role === 'user' && { color: '#fff' }]}>{t.text}</Text>
            </View>
          </View>
        ))}

        {loading && (
          <View style={styles.bubbleRow}>
            <View style={[styles.bubble, { backgroundColor: Colors.surfaceAlt, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }]}>
              <ActivityIndicator size="small" color={Colors.textSecondary} />
              <Text style={styles.thinkingText}>Thinking…</Text>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask the Shop Assistant…"
          placeholderTextColor={Colors.textLight}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: primary, opacity: loading || !input.trim() ? 0.5 : 1 }]}
          onPress={() => send(input)}
          disabled={loading || !input.trim()}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  welcome: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  suggestion: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm },
  suggestionText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' },

  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '85%', borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  bubbleText: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  thinkingText: { fontSize: FontSize.sm, color: Colors.textSecondary },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.errorBg, padding: Spacing.md, borderRadius: BorderRadius.md },
  errorText: { color: Colors.error, flex: 1, fontWeight: '600', fontSize: FontSize.sm },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  input: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, color: Colors.text, fontSize: FontSize.sm },
  sendBtn: { width: 44, height: 44, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
});
