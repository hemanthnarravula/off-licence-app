import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";

type LookupResult =
  | { found: false; barcode: string }
  | {
      found: true;
      product: {
        id: string;
        name: string;
        brand: string | null;
        category: string;
        sourcePlaceName: string | null;
        barcode: string;
      };
      inventory: {
        quantity: number | null;
        quantityUnset: boolean;
      };
    };

export default function ScanScreen() {
  const { storeId, membership, setStoreId } = useSession();
  const router = useRouter();
  const canAddProduct =
    membership?.role === "owner" || membership?.role === "manager";
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [counted, setCounted] = useState("");
  const [requestQty, setRequestQty] = useState("6");
  const [note, setNote] = useState("");
  const [flagNote, setFlagNote] = useState("");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (membership?.storeIds === null || (membership?.storeIds?.length ?? 0) > 1) {
      void apiFetch<{ stores: { id: string; name: string }[] }>("/api/stores").then(
        (res) => {
          if (res.ok) {
            setStores(res.data.stores);
            if (!storeId && res.data.stores[0]) {
              setStoreId(res.data.stores[0].id);
            }
          }
        },
      );
    }
  }, [membership, storeId, setStoreId]);

  const runLookup = useCallback(
    async (code: string) => {
      if (!storeId) {
        Alert.alert("Select a store first");
        return;
      }
      setBusy(true);
      setMessage(null);
      setLookup(null);
      const res = await apiFetch<LookupResult>(
        `/api/products/by-barcode?barcode=${encodeURIComponent(code)}&storeId=${storeId}`,
      );
      setBusy(false);
      if (!res.ok) {
        Alert.alert("Lookup failed", String((res.data as { error?: string })?.error));
        return;
      }
      setLookup(res.data);
      setBarcode(code);
      if (res.data.found && !res.data.inventory.quantityUnset) {
        setCounted(String(res.data.inventory.quantity ?? ""));
      } else {
        setCounted("");
      }
    },
    [storeId],
  );

  async function submitCount(confirmLargeDelta = false) {
    if (!lookup || !lookup.found || !storeId) return;
    setBusy(true);
    const qty = Number(counted);
    const res = await apiFetch<{
      error?: string;
      requiresConfirm?: boolean;
      previousQuantity?: number | null;
    }>("/api/stock-counts", {
      method: "POST",
      json: {
        storeId,
        productId: lookup.product.id,
        quantityCounted: qty,
        confirmLargeDelta,
      },
    });
    setBusy(false);

    if (res.status === 409 && res.data.requiresConfirm) {
      Alert.alert(
        "Confirm large change",
        `Previous qty was ${res.data.previousQuantity ?? "unset"}. Save ${qty}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: () => void submitCount(true),
          },
        ],
      );
      return;
    }

    if (!res.ok) {
      Alert.alert("Count failed", res.data.error ?? "Unknown error");
      return;
    }
    setMessage(`Stock count saved: ${qty}`);
    await runLookup(lookup.product.barcode);
  }

  async function submitRequest() {
    if (!lookup || !lookup.found || !storeId) return;
    setBusy(true);
    const res = await apiFetch<{ error?: string; upserted?: boolean }>(
      "/api/stock-requests",
      {
        method: "POST",
        json: {
          storeId,
          productId: lookup.product.id,
          quantityRequested: Number(requestQty),
          note: note || null,
        },
      },
    );
    setBusy(false);
    if (!res.ok) {
      Alert.alert("Request failed", res.data.error ?? "Unknown error");
      return;
    }
    setMessage(
      res.data.upserted
        ? "Updated open stock request"
        : "Created open stock request",
    );
  }

  async function flagUnknown() {
    if (!storeId || !barcode) return;
    setBusy(true);
    const res = await apiFetch<{ error?: string }>("/api/product-suggestions", {
      method: "POST",
      json: {
        storeId,
        barcode,
        note: flagNote || null,
      },
    });
    setBusy(false);
    if (!res.ok) {
      Alert.alert("Flag failed", res.data.error ?? "Unknown error");
      return;
    }
    setMessage("Flagged for owner");
    setLookup(null);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Scan</Text>
      {!storeId ? (
        <Text style={styles.meta}>Choose a store to continue.</Text>
      ) : (
        <Text style={styles.meta}>Store: {storeId.slice(0, 8)}…</Text>
      )}

      {stores.length > 1 || membership?.storeIds === null ? (
        <View style={styles.storePicker}>
          {stores.map((store) => (
            <Pressable
              key={store.id}
              style={[
                styles.chip,
                storeId === store.id && styles.chipActive,
              ]}
              onPress={() => setStoreId(store.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  storeId === store.id && styles.chipTextActive,
                ]}
              >
                {store.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        value={barcode}
        onChangeText={setBarcode}
        placeholder="Enter or scan barcode"
        autoCapitalize="none"
      />
      <View style={styles.row}>
        <Pressable
          style={styles.button}
          onPress={() => void runLookup(barcode.trim())}
          disabled={busy || !barcode.trim()}
        >
          <Text style={styles.buttonText}>Look up</Text>
        </Pressable>
        <Pressable
          style={styles.secondary}
          onPress={async () => {
            if (!permission?.granted) {
              const result = await requestPermission();
              if (!result.granted) {
                Alert.alert("Camera permission needed");
                return;
              }
            }
            setScannerOpen((open) => !open);
          }}
        >
          <Text style={styles.secondaryText}>
            {scannerOpen ? "Close camera" : "Open camera"}
          </Text>
        </Pressable>
      </View>

      {scannerOpen && permission?.granted ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
            }}
            onBarcodeScanned={({ data }) => {
              setScannerOpen(false);
              setBarcode(data);
              void runLookup(data);
            }}
          />
        </View>
      ) : null}

      {busy ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {lookup && !lookup.found ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Unknown barcode</Text>
          <Text style={styles.meta}>{lookup.barcode}</Text>
          {canAddProduct ? (
            <Pressable
              style={styles.button}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/products",
                  params: { barcode: lookup.barcode },
                })
              }
            >
              <Text style={styles.buttonText}>Add product</Text>
            </Pressable>
          ) : null}
          <TextInput
            style={styles.input}
            value={flagNote}
            onChangeText={setFlagNote}
            placeholder="Optional note for owner"
          />
          <Pressable
            style={canAddProduct ? styles.secondary : styles.button}
            onPress={() => void flagUnknown()}
          >
            <Text
              style={
                canAddProduct ? styles.secondaryText : styles.buttonText
              }
            >
              Flag for owner
            </Text>
          </Pressable>
        </View>
      ) : null}

      {lookup && lookup.found ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{lookup.product.name}</Text>
          <Text style={styles.meta}>
            {lookup.product.barcode}
            {lookup.product.brand ? ` · ${lookup.product.brand}` : ""}
            {lookup.product.sourcePlaceName
              ? ` · ${lookup.product.sourcePlaceName}`
              : ""}
          </Text>
          <Text style={styles.meta}>
            System qty:{" "}
            {lookup.inventory.quantityUnset
              ? "No qty yet — enter counted"
              : lookup.inventory.quantity}
          </Text>

          <Text style={styles.label}>Stock count</Text>
          <TextInput
            style={styles.input}
            value={counted}
            onChangeText={setCounted}
            keyboardType="number-pad"
            placeholder="Counted quantity"
          />
          <Pressable style={styles.button} onPress={() => void submitCount()}>
            <Text style={styles.buttonText}>Save count</Text>
          </Pressable>

          <Text style={[styles.label, { marginTop: 16 }]}>Request stock</Text>
          <TextInput
            style={styles.input}
            value={requestQty}
            onChangeText={setRequestQty}
            keyboardType="number-pad"
            placeholder="Qty needed"
          />
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="Optional note"
          />
          <Pressable style={styles.secondary} onPress={() => void submitRequest()}>
            <Text style={styles.secondaryText}>Create / update request</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 10, paddingBottom: 40, backgroundColor: "#fafafa" },
  title: { fontSize: 28, fontWeight: "700", color: "#18181b" },
  meta: { color: "#52525b", fontSize: 14 },
  label: { fontWeight: "600", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  row: { flexDirection: "row", gap: 8 },
  button: {
    backgroundColor: "#18181b",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    flex: 1,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondary: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    flex: 1,
    backgroundColor: "#fff",
  },
  secondaryText: { fontWeight: "600", color: "#18181b" },
  cameraWrap: {
    height: 220,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  card: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 12,
    padding: 14,
    gap: 8,
    backgroundColor: "#fff",
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#18181b" },
  message: {
    color: "#047857",
    backgroundColor: "#ecfdf5",
    padding: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  storePicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
});
