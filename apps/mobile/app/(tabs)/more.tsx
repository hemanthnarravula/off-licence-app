import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";

const dashboardUrl =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type Suggestion = {
  id: string;
  barcode: string;
  note: string | null;
  storeName: string;
  suggestedByName: string;
  suggestedByEmail: string;
};

type Store = { id: string; name: string };

export default function MoreScreen() {
  const { user, membership, storeId, signOut } = useSession();
  const router = useRouter();
  const canManage =
    membership?.role === "owner" || membership?.role === "manager";
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);

  const storeName = useMemo(
    () => stores.find((store) => store.id === storeId)?.name,
    [stores, storeId],
  );

  const loadSuggestions = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    const res = await apiFetch<{
      suggestions: Suggestion[];
      error?: string;
    }>("/api/product-suggestions?status=open");
    setLoading(false);
    if (!res.ok) {
      Alert.alert("Failed", res.data.error ?? "Could not load suggestions");
      return;
    }
    setSuggestions(res.data.suggestions ?? []);
  }, [canManage]);

  useEffect(() => {
    void apiFetch<{ stores: Store[] }>("/api/stores").then((res) => {
      if (res.ok) setStores(res.data.stores ?? []);
    });
  }, []);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  async function accept(id: string, barcode: string) {
    const res = await apiFetch<{ error?: string }>(
      `/api/product-suggestions/${id}/accept`,
      { method: "POST" },
    );
    if (!res.ok) {
      Alert.alert("Accept failed", res.data.error ?? "Unknown error");
      return;
    }
    router.push({
      pathname: "/(tabs)/products",
      params: { barcode },
    });
    await loadSuggestions();
  }

  async function dismiss(id: string) {
    const res = await apiFetch<{ error?: string }>(
      `/api/product-suggestions/${id}/dismiss`,
      { method: "POST" },
    );
    if (!res.ok) {
      Alert.alert("Dismiss failed", res.data.error ?? "Unknown error");
      return;
    }
    await loadSuggestions();
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        canManage ? (
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void loadSuggestions()}
          />
        ) : undefined
      }
    >
      <Text style={styles.meta}>{user?.email}</Text>
      <Text style={styles.meta}>
        Role: {membership?.role ?? "none"}
        {storeName ? ` · ${storeName}` : ""}
      </Text>

      {canManage ? (
        <>
          <Pressable
            style={styles.button}
            onPress={() => void Linking.openURL(`${dashboardUrl}/dashboard`)}
          >
            <Text style={styles.buttonText}>Open web dashboard</Text>
          </Pressable>
          <Text style={styles.section}>Open suggestions</Text>
          <Text style={styles.meta}>
            Accept to add a product with the barcode prefilled, or dismiss.
          </Text>
          {loading && !suggestions.length ? <ActivityIndicator /> : null}
          {!loading && !suggestions.length ? (
            <Text style={styles.meta}>No open suggestions.</Text>
          ) : null}
          {suggestions.map((row) => (
            <View key={row.id} style={styles.card}>
              <Text style={styles.cardTitle}>{row.barcode}</Text>
              <Text style={styles.meta}>
                {row.storeName} · {row.suggestedByName || row.suggestedByEmail}
              </Text>
              {row.note ? <Text style={styles.meta}>{row.note}</Text> : null}
              <View style={styles.row}>
                <Pressable
                  style={[styles.button, styles.rowButton]}
                  onPress={() => void accept(row.id, row.barcode)}
                >
                  <Text style={styles.buttonText}>Accept</Text>
                </Pressable>
                <Pressable
                  style={[styles.secondary, styles.rowButton]}
                  onPress={() => void dismiss(row.id)}
                >
                  <Text style={styles.secondaryText}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : null}

      <Pressable style={styles.secondary} onPress={() => void signOut()}>
        <Text style={styles.secondaryText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 10,
    paddingBottom: 40,
    backgroundColor: "#fafafa",
  },
  section: { marginTop: 12, fontSize: 18, fontWeight: "700", color: "#18181b" },
  meta: { color: "#52525b", fontSize: 14 },
  row: { flexDirection: "row", gap: 8, marginTop: 6 },
  rowButton: { flex: 1 },
  button: {
    marginTop: 4,
    backgroundColor: "#18181b",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondary: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  secondaryText: { fontWeight: "600", color: "#18181b" },
  card: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 12,
    padding: 14,
    gap: 6,
    backgroundColor: "#fff",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#18181b" },
});
