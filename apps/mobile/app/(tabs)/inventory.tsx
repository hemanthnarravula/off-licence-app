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

type InventoryRow = {
  productId: string;
  barcode: string;
  name: string;
  category: string;
  quantity: number | null;
  reorderLevel: number | null;
  sourcePlaceName: string | null;
};

export default function InventoryScreen() {
  const { storeId } = useSession();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    const qs = lowStockOnly ? "?lowStock=1" : "";
    const res = await apiFetch<{ inventory: InventoryRow[]; error?: string }>(
      `/api/stores/${storeId}/inventory${qs}`,
    );
    setLoading(false);
    if (!res.ok) {
      Alert.alert("Failed", res.data.error ?? "Could not load inventory");
      return;
    }
    setRows(res.data.inventory ?? []);
  }, [storeId, lowStockOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function quickRequest(productId: string) {
    if (!storeId) return;
    Alert.alert("Request stock", "Create/update an open request for 6 units?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Request 6",
        onPress: async () => {
          setRequestingId(productId);
          const res = await apiFetch<{ error?: string }>("/api/stock-requests", {
            method: "POST",
            json: {
              storeId,
              productId,
              quantityRequested: 6,
            },
          });
          setRequestingId(null);
          if (!res.ok) {
            Alert.alert("Request failed", res.data.error ?? "Unknown error");
            return;
          }
          Alert.alert("Request saved");
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
      <Text style={styles.title}>Inventory</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.chip, !lowStockOnly && styles.chipActive]}
          onPress={() => setLowStockOnly(false)}
        >
          <Text style={[styles.chipText, !lowStockOnly && styles.chipTextActive]}>
            All
          </Text>
        </Pressable>
        <Pressable
          style={[styles.chip, lowStockOnly && styles.chipActive]}
          onPress={() => setLowStockOnly(true)}
        >
          <Text style={[styles.chipText, lowStockOnly && styles.chipTextActive]}>
            Low stock
          </Text>
        </Pressable>
      </View>

      {!storeId ? (
        <Text style={styles.meta}>No store selected.</Text>
      ) : null}
      {loading && !rows.length ? <ActivityIndicator /> : null}
      {!loading && !rows.length ? (
        <Text style={styles.meta}>No inventory rows yet.</Text>
      ) : null}

      {rows.map((row) => (
        <View key={row.productId} style={styles.card}>
          <Text style={styles.cardTitle}>{row.name}</Text>
          <Text style={styles.meta}>
            {row.barcode} · {row.category}
            {row.sourcePlaceName ? ` · ${row.sourcePlaceName}` : ""}
          </Text>
          <Text style={styles.meta}>
            Qty: {row.quantity == null ? "unset" : row.quantity}
            {row.reorderLevel != null ? ` · reorder ${row.reorderLevel}` : ""}
          </Text>
          <Pressable
            style={styles.secondary}
            disabled={requestingId === row.productId}
            onPress={() => void quickRequest(row.productId)}
          >
            <Text style={styles.secondaryText}>
              {requestingId === row.productId ? "Saving…" : "Request stock"}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "700" },
  meta: { color: "#52525b", fontSize: 14 },
  row: { flexDirection: "row", gap: 8 },
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
