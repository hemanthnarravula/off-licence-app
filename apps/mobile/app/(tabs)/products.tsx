import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";

const CATEGORIES = [
  "beer",
  "wine",
  "spirits",
  "soft_drinks",
  "tobacco",
  "snacks",
  "other",
] as const;

type SourcePlace = { id: string; name: string };
type ProductRow = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  category: string;
  sourcePlaceName: string | null;
  imageUrl?: string | null;
};

type AnalyzeResponse = {
  error?: string;
  imageUrl?: string;
  extracted?: {
    name: string | null;
    brand: string | null;
    category: string | null;
    size: string | null;
  } | null;
  extractionWarning?: string | null;
};

function isCategory(
  value: string | null | undefined,
): value is (typeof CATEGORIES)[number] {
  return (
    typeof value === "string" &&
    (CATEGORIES as readonly string[]).includes(value)
  );
}

export default function ProductsScreen() {
  const { membership } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode?: string }>();
  const canEdit =
    membership?.role === "owner" || membership?.role === "manager";

  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]>("other");
  const [sourcePlaceId, setSourcePlaceId] = useState<string>("");
  const [size, setSize] = useState("");
  const [abv, setAbv] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [localPreviewUri, setLocalPreviewUri] = useState<string | null>(null);
  const [places, setPlaces] = useState<SourcePlace[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof params.barcode === "string" && params.barcode) {
      setBarcode(params.barcode);
    }
  }, [params.barcode]);

  const load = useCallback(async () => {
    if (!canEdit) return;
    const [placesRes, productsRes] = await Promise.all([
      apiFetch<{ sourcePlaces: SourcePlace[] }>("/api/source-places"),
      apiFetch<{ products: ProductRow[] }>("/api/products"),
    ]);
    if (placesRes.ok) {
      setPlaces(placesRes.data.sourcePlaces ?? []);
      if (!sourcePlaceId && placesRes.data.sourcePlaces?.[0]) {
        setSourcePlaceId(placesRes.data.sourcePlaces[0].id);
      }
    }
    if (productsRes.ok) {
      setProducts((productsRes.data.products ?? []).slice(0, 20));
    }
  }, [canEdit, sourcePlaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function analyzeAsset(asset: ImagePicker.ImagePickerAsset) {
    setAnalyzing(true);
    setMessage(null);
    setLocalPreviewUri(asset.uri);

    const form = new FormData();
    const mime = asset.mimeType ?? "image/jpeg";
    const ext = mime.includes("png")
      ? "png"
      : mime.includes("webp")
        ? "webp"
        : "jpg";
    form.append("file", {
      uri: asset.uri,
      name: asset.fileName ?? `label.${ext}`,
      type: mime,
    } as unknown as Blob);

    const res = await apiFetch<AnalyzeResponse>("/api/products/analyze-photo", {
      method: "POST",
      body: form,
    });
    setAnalyzing(false);

    if (!res.ok) {
      Alert.alert("Photo failed", res.data.error ?? "Could not analyse photo");
      return;
    }

    if (res.data.imageUrl) {
      setImageUrl(res.data.imageUrl);
    }

    const extracted = res.data.extracted;
    if (extracted) {
      if (extracted.name) setName(extracted.name);
      if (extracted.brand) setBrand(extracted.brand);
      if (extracted.size) setSize(extracted.size);
      if (isCategory(extracted.category)) setCategory(extracted.category);
      setMessage("Filled fields from the label photo — check and save.");
    } else if (res.data.extractionWarning) {
      setMessage(res.data.extractionWarning);
    } else {
      setMessage("Photo attached — fill in the fields and save.");
    }
  }

  function pickPhoto() {
    Alert.alert("Product photo", "Take a label photo or choose from library", [
      {
        text: "Camera",
        onPress: () => {
          void (async () => {
            const permission =
              await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert("Camera permission is required");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.7,
              allowsEditing: false,
            });
            if (!result.canceled && result.assets[0]) {
              await analyzeAsset(result.assets[0]);
            }
          })();
        },
      },
      {
        text: "Library",
        onPress: () => {
          void (async () => {
            const permission =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert("Photo library permission is required");
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.7,
              allowsEditing: false,
            });
            if (!result.canceled && result.assets[0]) {
              await analyzeAsset(result.assets[0]);
            }
          })();
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function clearPhoto() {
    setImageUrl(null);
    setLocalPreviewUri(null);
  }

  async function save() {
    if (!barcode.trim() || !name.trim()) {
      Alert.alert("Barcode and name are required");
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await apiFetch<{ error?: string; product?: { id: string } }>(
      "/api/products",
      {
        method: "POST",
        json: {
          barcode: barcode.trim(),
          name: name.trim(),
          brand: brand.trim() || null,
          category,
          sourcePlaceId: sourcePlaceId || null,
          size: size.trim() || null,
          abv: abv.trim() || null,
          imageUrl: imageUrl || null,
        },
      },
    );
    setBusy(false);
    if (!res.ok) {
      Alert.alert("Save failed", res.data.error ?? "Unknown error");
      return;
    }
    setMessage(`Saved ${name.trim()}`);
    setBarcode("");
    setName("");
    setBrand("");
    setSize("");
    setAbv("");
    setImageUrl(null);
    setLocalPreviewUri(null);
    setCategory("other");
    router.setParams({ barcode: "" });
    await load();
  }

  if (!canEdit) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Products</Text>
        <Text style={styles.meta}>Owner or manager access only.</Text>
      </View>
    );
  }

  const previewUri = localPreviewUri ?? imageUrl;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add product</Text>
      <Text style={styles.meta}>
        Photograph the label to fill name, brand, size, and category. CSV import
        stays on the web dashboard.
      </Text>

      <Pressable
        style={[styles.button, styles.secondaryButton]}
        onPress={pickPhoto}
        disabled={analyzing || busy}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          {analyzing ? "Reading label…" : "Photo → extract details"}
        </Text>
      </Pressable>
      {analyzing ? <ActivityIndicator /> : null}

      {previewUri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: previewUri }} style={styles.preview} />
          <Pressable onPress={clearPhoto} style={styles.clearPhoto}>
            <Text style={styles.clearPhotoText}>Remove photo</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.label}>Barcode</Text>
      <TextInput
        style={styles.input}
        value={barcode}
        onChangeText={setBarcode}
        placeholder="Barcode"
        autoCapitalize="none"
      />
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Product name"
      />
      <Text style={styles.label}>Brand</Text>
      <TextInput
        style={styles.input}
        value={brand}
        onChangeText={setBrand}
        placeholder="Optional brand"
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.rowWrap}>
        {CATEGORIES.map((value) => (
          <Pressable
            key={value}
            style={[styles.chip, category === value && styles.chipActive]}
            onPress={() => setCategory(value)}
          >
            <Text
              style={[
                styles.chipText,
                category === value && styles.chipTextActive,
              ]}
            >
              {value.replace("_", " ")}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Source place</Text>
      <View style={styles.rowWrap}>
        <Pressable
          style={[styles.chip, !sourcePlaceId && styles.chipActive]}
          onPress={() => setSourcePlaceId("")}
        >
          <Text
            style={[styles.chipText, !sourcePlaceId && styles.chipTextActive]}
          >
            None
          </Text>
        </Pressable>
        {places.map((place) => (
          <Pressable
            key={place.id}
            style={[
              styles.chip,
              sourcePlaceId === place.id && styles.chipActive,
            ]}
            onPress={() => setSourcePlaceId(place.id)}
          >
            <Text
              style={[
                styles.chipText,
                sourcePlaceId === place.id && styles.chipTextActive,
              ]}
            >
              {place.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Size / pack</Text>
      <TextInput
        style={styles.input}
        value={size}
        onChangeText={setSize}
        placeholder="e.g. 500ml, 12x330ml"
      />
      <Text style={styles.label}>ABV</Text>
      <TextInput
        style={styles.input}
        value={abv}
        onChangeText={setAbv}
        placeholder="e.g. 5.0%"
      />

      <Pressable
        style={styles.button}
        onPress={() => void save()}
        disabled={busy || analyzing}
      >
        <Text style={styles.buttonText}>{busy ? "Saving…" : "Save product"}</Text>
      </Pressable>
      {busy ? <ActivityIndicator /> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Text style={[styles.title, { fontSize: 20, marginTop: 16 }]}>
        Recent catalogue
      </Text>
      {!products.length ? (
        <Text style={styles.meta}>No products yet.</Text>
      ) : null}
      {products.map((row) => (
        <View key={row.id} style={styles.card}>
          <View style={styles.cardRow}>
            {row.imageUrl ? (
              <Image source={{ uri: row.imageUrl }} style={styles.thumb} />
            ) : null}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.cardTitle}>{row.name}</Text>
              <Text style={styles.meta}>
                {row.barcode}
                {row.brand ? ` · ${row.brand}` : ""}
                {` · ${row.category.replace("_", " ")}`}
                {row.sourcePlaceName ? ` · ${row.sourcePlaceName}` : ""}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 8,
    paddingBottom: 40,
    backgroundColor: "#fafafa",
  },
  title: { fontSize: 28, fontWeight: "700", color: "#18181b" },
  meta: { color: "#52525b", fontSize: 14 },
  label: { fontWeight: "600", marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  button: {
    marginTop: 8,
    backgroundColor: "#18181b",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#18181b",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondaryButtonText: { color: "#18181b" },
  previewWrap: { gap: 8 },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#e4e4e7",
  },
  clearPhoto: { alignSelf: "flex-start" },
  clearPhotoText: { color: "#b91c1c", fontWeight: "600" },
  message: {
    color: "#047857",
    backgroundColor: "#ecfdf5",
    padding: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  card: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 12,
    padding: 14,
    gap: 4,
    backgroundColor: "#fff",
  },
  cardRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#e4e4e7" },
  cardTitle: { fontSize: 16, fontWeight: "700" },
});
