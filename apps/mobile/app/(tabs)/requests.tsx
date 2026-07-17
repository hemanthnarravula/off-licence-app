import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";

type RequestRow = {
  id: string;
  productName: string;
  barcode: string;
  quantityRequested: number;
  status: string;
  note: string | null;
  storeName: string;
};

export default function RequestsScreen() {
  const { storeId } = useSession();
  const [status, setStatus] = useState<"open" | "done" | "cancelled">("open");
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ requests: RequestRow[]; error?: string }>(
      `/api/stock-requests?status=${status}`,
    );
    setLoading(false);
    if (!res.ok) {
      Alert.alert("Failed", res.data.error ?? "Could not load requests");
      return;
    }
    const filtered = storeId
      ? (res.data.requests ?? []).filter((row) =>
          // API already scopes, but keep store focus if multiple
          true,
        )
      : res.data.requests ?? [];
    setRows(filtered);
  }, [status, storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancel(id: string) {
    Alert.alert("Cancel request?", undefined, [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          const res = await apiFetch<{ error?: string }>(
            `/api/stock-requests/${id}/cancel`,
            { method: "POST" },
          );
          if (!res.ok) {
            Alert.alert("Cancel failed", res.data.error ?? "Unknown error");
            return;
          }
          await load();
        },
      },
    ]);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void load()} />
      }
    >
      <Text style={styles.title}>Requests</Text>
      <View style={styles.row}>
        {(["open", "done", "cancelled"] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.chip, status === value && styles.chipActive]}
            onPress={() => setStatus(value)}
          >
            <Text
              style={[
                styles.chipText,
                status === value && styles.chipTextActive,
              ]}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading && !rows.length ? <ActivityIndicator /> : null}
      {!loading && !rows.length ? (
        <Text style={styles.meta}>No {status} requests.</Text>
      ) : null}

      {rows.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.cardTitle}>{row.productName}</Text>
          <Text style={styles.meta}>
            {row.storeName} · qty {row.quantityRequested} · {row.barcode}
          </Text>
          {row.note ? <Text style={styles.meta}>{row.note}</Text> : null}
          {status === "open" ? (
            <Pressable style={styles.secondary} onPress={() => void cancel(row.id)}>
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "700" },
  meta: { color: "#52525b", fontSize: 14 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#18181b", borderColor: "#18181b" },
  chipText: { color: "#18181b", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  card: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 12,
    padding: 14,
    gap: 6,
    backgroundColor: "#fff",
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  secondary: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryText: { fontWeight: "600" },
});
