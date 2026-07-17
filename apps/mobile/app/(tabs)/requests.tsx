import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";

type RequestRow = {
  id: string;
  productName: string;
  barcode: string;
  category: string;
  quantityRequested: number;
  status: string;
  note: string | null;
  storeName: string;
  requestedByName?: string;
  requestedByEmail?: string;
  quantityBought?: number | null;
};

type Group = {
  sourcePlaceId: string | null;
  sourcePlaceName: string;
  categories: {
    category: string;
    requests: RequestRow[];
  }[];
};

export default function RequestsScreen() {
  const { membership } = useSession();
  const canFulfil =
    membership?.role === "owner" || membership?.role === "manager";
  const [status, setStatus] = useState<"open" | "done" | "cancelled">("open");
  const [groups, setGroups] = useState<Group[]>([]);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fulfilId, setFulfilId] = useState<string | null>(null);
  const [boughtQty, setBoughtQty] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{
      groups?: Group[];
      requests: RequestRow[];
      error?: string;
    }>(`/api/stock-requests?status=${status}`);
    setLoading(false);
    if (!res.ok) {
      Alert.alert("Failed", res.data.error ?? "Could not load requests");
      return;
    }
    setGroups(res.data.groups ?? []);
    setRows(res.data.requests ?? []);
    setFulfilId(null);
  }, [status]);

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
          setBusyId(id);
          const res = await apiFetch<{ error?: string }>(
            `/api/stock-requests/${id}/cancel`,
            { method: "POST" },
          );
          setBusyId(null);
          if (!res.ok) {
            Alert.alert("Cancel failed", res.data.error ?? "Unknown error");
            return;
          }
          await load();
        },
      },
    ]);
  }

  async function fulfil(id: string) {
    const quantityBought = Number(boughtQty);
    if (!Number.isInteger(quantityBought) || quantityBought < 0) {
      Alert.alert("Enter a valid non-negative quantity bought");
      return;
    }
    setBusyId(id);
    const res = await apiFetch<{ error?: string }>(
      `/api/stock-requests/${id}/fulfil`,
      {
        method: "POST",
        json: { quantityBought },
      },
    );
    setBusyId(null);
    if (!res.ok) {
      Alert.alert("Fulfil failed", res.data.error ?? "Unknown error");
      return;
    }
    setFulfilId(null);
    setBoughtQty("");
    await load();
  }

  function renderActions(row: RequestRow) {
    if (status !== "open") return null;

    if (canFulfil && fulfilId === row.id) {
      return (
        <View style={styles.fulfilBox}>
          <Text style={styles.label}>Quantity bought</Text>
          <TextInput
            style={styles.input}
            value={boughtQty}
            onChangeText={setBoughtQty}
            keyboardType="number-pad"
            placeholder={String(row.quantityRequested)}
          />
          <View style={styles.row}>
            <Pressable
              style={styles.button}
              disabled={busyId === row.id}
              onPress={() => void fulfil(row.id)}
            >
              <Text style={styles.buttonText}>Confirm done</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => {
                setFulfilId(null);
                setBoughtQty("");
              }}
            >
              <Text style={styles.secondaryText}>Back</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.row}>
        {canFulfil ? (
          <Pressable
            style={styles.button}
            disabled={busyId === row.id}
            onPress={() => {
              setFulfilId(row.id);
              setBoughtQty(String(row.quantityRequested));
            }}
          >
            <Text style={styles.buttonText}>Mark done</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.secondary}
          disabled={busyId === row.id}
          onPress={() => void cancel(row.id)}
        >
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  function renderCard(row: RequestRow) {
    return (
      <View key={row.id} style={styles.card}>
        <Text style={styles.cardTitle}>{row.productName}</Text>
        <Text style={styles.meta}>
          {row.storeName} · qty {row.quantityRequested} · {row.barcode}
        </Text>
        {row.requestedByName || row.requestedByEmail ? (
          <Text style={styles.meta}>
            Asked by {row.requestedByName || row.requestedByEmail}
          </Text>
        ) : null}
        {row.note ? <Text style={styles.meta}>{row.note}</Text> : null}
        {status === "done" && row.quantityBought != null ? (
          <Text style={styles.meta}>Bought {row.quantityBought}</Text>
        ) : null}
        {renderActions(row)}
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void load()} />
      }
    >
      <Text style={styles.title}>Requests</Text>
      {canFulfil ? (
        <Text style={styles.meta}>
          Grouped by source place → category. Mark done after cash &amp; carry.
        </Text>
      ) : (
        <Text style={styles.meta}>Your store&apos;s stock requests.</Text>
      )}

      <View style={styles.rowWrap}>
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

      {canFulfil
        ? groups.map((group) => (
            <View key={group.sourcePlaceId ?? "none"} style={styles.group}>
              <Text style={styles.groupTitle}>{group.sourcePlaceName}</Text>
              {group.categories.map((bucket) => (
                <View key={bucket.category} style={styles.categoryBlock}>
                  <Text style={styles.categoryTitle}>
                    {bucket.category.replace("_", " ")}
                  </Text>
                  {bucket.requests.map(renderCard)}
                </View>
              ))}
            </View>
          ))
        : rows.map(renderCard)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "700" },
  meta: { color: "#52525b", fontSize: 14 },
  label: { fontWeight: "600" },
  row: { flexDirection: "row", gap: 8, marginTop: 6 },
  rowWrap: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
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
  group: { gap: 8, marginTop: 8 },
  groupTitle: { fontSize: 18, fontWeight: "700" },
  categoryBlock: { gap: 8 },
  categoryTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 12,
    padding: 14,
    gap: 6,
    backgroundColor: "#fff",
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  fulfilBox: { gap: 8, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  button: {
    flex: 1,
    backgroundColor: "#18181b",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  secondaryText: { fontWeight: "600" },
});
