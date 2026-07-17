import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Text } from "@/components/Themed";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

const BARCODE_TYPES = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "code93",
] as const;

const CATEGORIES = [
  "beer",
  "wine",
  "spirits",
  "soft_drinks",
  "tobacco",
  "snacks",
  "other",
] as const;

type Availability = {
  storeId: string;
  storeName: string;
  storeAddress: string;
  quantity: number;
  sellPricePence: number;
};

type LookupResult = {
  product: {
    id: string;
    name: string;
    brand: string | null;
    category: string;
    barcode: string;
    imageUrl?: string | null;
  };
  availability: Availability[];
};

type NotFoundState = {
  barcode: string;
};

function formatPrice(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export default function ScanScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const isDark = colorScheme === "dark";

  const palette = useMemo(
    () => ({
      text: theme.text,
      muted: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.65)",
      subtle: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
      card: isDark ? "#1c1c1e" : "#f4f1ec",
      cardBorder: isDark ? "#2c2c2e" : "#e6d9c8",
      inputBg: isDark ? "#2c2c2e" : "#ffffff",
      inputBorder: isDark ? "#3a3a3c" : "#cccccc",
      inputText: theme.text,
      placeholder: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
      chipBg: isDark ? "#2c2c2e" : "#ffffff",
      chipBorder: isDark ? "#3a3a3c" : "#cccccc",
      primary: isDark ? "#f2f2f2" : "#1a1a1a",
      primaryText: isDark ? "#111111" : "#ffffff",
      optionBg: isDark ? "#2c2c2e" : "#ffffff",
      optionBorder: isDark ? "#3a3a3c" : "#dddddd",
      error: "#ff6b6b",
      danger: "#c62828",
      dangerText: "#ffffff",
      divider: isDark ? "#3a3a3c" : "#dddddd",
      cameraPlaceholder: isDark ? "#2c2c2e" : "#eeeeee",
    }),
    [isDark, theme.text],
  );

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [notFound, setNotFound] = useState<NotFoundState | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addBrand, setAddBrand] = useState("");
  const [addCategory, setAddCategory] =
    useState<(typeof CATEGORIES)[number]>("other");
  const [addSourcePlace, setAddSourcePlace] = useState("Booker");
  const [addPrice, setAddPrice] = useState("");
  const [addQuantity, setAddQuantity] = useState("");
  const [addImageUrl, setAddImageUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const lockRef = useRef(false);

  const lookup = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || lockRef.current) return;

    lockRef.current = true;
    setBarcode(trimmed);
    setScanning(false);
    setLoading(true);
    setError(null);
    setResult(null);
    setNotFound(null);
    setShowAddForm(false);

    try {
      const res = await fetch(
        `${API_URL}/api/products/by-barcode?barcode=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();
      if (res.status === 404) {
        setNotFound({ barcode: trimmed });
        setShowAddForm(true);
        setAddName("");
        setAddBrand("");
        setAddCategory("other");
        setAddSourcePlace("Booker");
        setAddPrice("");
        setAddQuantity("");
        setAddImageUrl(null);
        setPhotoPreview(null);
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Lookup failed");
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
      lockRef.current = false;
    }
  }, []);

  function onBarcodeScanned(scan: BarcodeScanningResult) {
    if (!scanning || lockRef.current) return;
    void lookup(scan.data);
  }

  function resumeScanning() {
    setResult(null);
    setError(null);
    setNotFound(null);
    setShowAddForm(false);
    setAddName("");
    setAddBrand("");
    setAddPrice("");
    setAddQuantity("");
    setAddImageUrl(null);
    setPhotoPreview(null);
    setBarcode("");
    setScanning(true);
  }

  function openAddForm() {
    setShowAddForm(true);
    setAddName("");
    setAddBrand("");
    setAddCategory("other");
    setAddSourcePlace("Booker");
    setAddPrice("");
    setAddQuantity("");
    setAddImageUrl(null);
    setPhotoPreview(null);
    setError(null);
  }

  async function analyzePhoto(asset: ImagePicker.ImagePickerAsset) {
    setAnalyzingPhoto(true);
    setError(null);
    setPhotoPreview(asset.uri);

    try {
      const form = new FormData();
      const filename = asset.fileName ?? `product-${Date.now()}.jpg`;
      const mime = asset.mimeType ?? "image/jpeg";
      form.append("photo", {
        uri: asset.uri,
        name: filename,
        type: mime,
      } as unknown as Blob);

      const res = await fetch(`${API_URL}/api/products/analyze-photo`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not analyze photo");
      }

      if (data.imageUrl) {
        setAddImageUrl(data.imageUrl);
      }

      if (data.extracted) {
        const extracted = data.extracted as {
          name?: string | null;
          brand?: string | null;
          category?: string | null;
        };
        if (extracted.name?.trim()) {
          setAddName(extracted.name.trim());
        }
        if (extracted.brand?.trim()) {
          setAddBrand(extracted.brand.trim());
        }
        const category = extracted.category?.trim();
        if (
          category &&
          (CATEGORIES as readonly string[]).includes(category)
        ) {
          setAddCategory(category as (typeof CATEGORIES)[number]);
        }
      } else if (data.message) {
        setError(data.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not analyze photo");
    } finally {
      setAnalyzingPhoto(false);
    }
  }

  async function takeProductPhoto() {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      Alert.alert(
        "Camera permission",
        "Allow camera access to take a product photo.",
      );
      setError("Camera permission is needed to take a product photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      await analyzePhoto(result.assets[0]);
    }
  }

  async function pickProductPhoto() {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) {
      Alert.alert(
        "Photos permission",
        "Allow photo library access to choose a product image.",
      );
      setError("Photo library permission is needed.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      await analyzePhoto(result.assets[0]);
    }
  }

  async function addProduct() {
    if (!notFound || !addName.trim() || adding) return;

    const priceTrimmed = addPrice.trim();
    const quantityTrimmed = addQuantity.trim();
    let sellPrice: number | undefined;
    let quantity: number | undefined;

    if (priceTrimmed) {
      const pounds = Number(priceTrimmed);
      if (!Number.isFinite(pounds) || pounds < 0) {
        setError("Enter a valid price in pounds (e.g. 2.50)");
        return;
      }
      sellPrice = pounds;
    }
    if (quantityTrimmed) {
      const qty = Number(quantityTrimmed);
      if (!Number.isFinite(qty) || qty < 0 || !Number.isInteger(qty)) {
        setError("Enter a whole-number quantity (e.g. 12)");
        return;
      }
      quantity = qty;
    }

    const createdBarcode = notFound.barcode;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: createdBarcode,
          name: addName.trim(),
          brand: addBrand.trim() || undefined,
          category: addCategory,
          sourcePlace: addSourcePlace.trim() || "Booker",
          imageUrl: addImageUrl || undefined,
          sellPrice,
          quantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not add product");
      }
      setShowAddForm(false);
      setNotFound(null);
      await lookup(createdBarcode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add product");
    } finally {
      setAdding(false);
    }
  }

  function confirmDeleteProduct() {
    if (!result?.product.id || deleting) return;

    Alert.alert(
      "Delete product?",
      `Remove “${result.product.name}” from the catalogue? This also clears store inventory for it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteProduct(),
        },
      ],
    );
  }

  async function deleteProduct() {
    if (!result?.product.id || deleting) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/products/${encodeURIComponent(result.product.id)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Could not delete product");
      }
      setResult(null);
      setBarcode("");
      setScanning(true);
      Alert.alert("Deleted", "Product removed from the catalogue.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete product");
    } finally {
      setDeleting(false);
    }
  }

  const cameraBlocked = Platform.OS === "web";

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Scan</Text>
      <Text style={[styles.hint, { color: palette.muted }]}>
        Point the camera at a product barcode, or type one below.
      </Text>

      {cameraBlocked ? (
        <View
          style={[
            styles.permissionBox,
            { backgroundColor: palette.card, borderColor: palette.cardBorder },
          ]}
        >
          <Text style={{ color: palette.muted }}>
            Camera scanning needs the iOS or Android app (Expo Go or a build).
            Use manual entry on web.
          </Text>
        </View>
      ) : !permission ? (
        <View
          style={[
            styles.cameraPlaceholder,
            { backgroundColor: palette.cameraPlaceholder },
          ]}
        >
          <ActivityIndicator color={palette.text} />
        </View>
      ) : !permission.granted ? (
        <View
          style={[
            styles.permissionBox,
            { backgroundColor: palette.card, borderColor: palette.cardBorder },
          ]}
        >
          <Text style={{ color: palette.muted }}>
            Camera access is needed to scan barcodes.
          </Text>
          <Pressable
            onPress={() => void requestPermission()}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: palette.primary },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: palette.primaryText }]}>
              Allow camera
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: [...BARCODE_TYPES],
            }}
            onBarcodeScanned={scanning ? onBarcodeScanned : undefined}
          />
          <View style={styles.viewfinder} pointerEvents="none" />
          {!scanning ? (
            <View style={styles.cameraOverlay}>
              <Pressable
                onPress={resumeScanning}
                style={({ pressed }) => [
                  styles.button,
                  styles.overlayButton,
                  { backgroundColor: palette.primary },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text
                  style={[styles.buttonText, { color: palette.primaryText }]}
                >
                  Scan again
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      )}

      <Text style={styles.sectionLabel}>Or enter barcode</Text>
      <TextInput
        value={barcode}
        onChangeText={setBarcode}
        placeholder="e.g. 5012345678900"
        placeholderTextColor={palette.placeholder}
        autoCapitalize="none"
        keyboardType="number-pad"
        style={[
          styles.input,
          {
            backgroundColor: palette.inputBg,
            borderColor: palette.inputBorder,
            color: palette.inputText,
          },
        ]}
      />
      <Pressable
        onPress={() => void lookup(barcode)}
        disabled={loading || !barcode.trim()}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: palette.primary },
          (loading || !barcode.trim()) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={palette.primaryText} />
        ) : (
          <Text style={[styles.buttonText, { color: palette.primaryText }]}>
            Look up
          </Text>
        )}
      </Pressable>

      {error ? (
        <Text style={[styles.error, { color: palette.error }]}>{error}</Text>
      ) : null}

      {notFound ? (
        <View
          style={[
            styles.notFoundBox,
            { backgroundColor: palette.card, borderColor: palette.cardBorder },
          ]}
        >
          <Text style={[styles.productName, { color: palette.text }]}>
            No product found
          </Text>
          <Text style={{ color: palette.muted }}>
            Barcode {notFound.barcode} is not in the catalogue yet.
          </Text>

          <View style={styles.addForm}>
              <Text style={[styles.sectionLabel, { color: palette.text }]}>
                Add with photo
              </Text>
              <Text style={{ color: palette.subtle, marginBottom: 4 }}>
                Take or choose a label photo to fill name and brand.
              </Text>

              <View style={styles.photoActions}>
                <Pressable
                  onPress={() => void takeProductPhoto()}
                  disabled={analyzingPhoto}
                  style={({ pressed }) => [
                    styles.optionButton,
                    styles.photoButton,
                    {
                      backgroundColor: palette.primary,
                      borderColor: palette.primary,
                    },
                    analyzingPhoto && styles.buttonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[styles.optionTitle, { color: palette.primaryText }]}
                  >
                    Take photo
                  </Text>
                  <Text style={{ color: palette.primaryText, opacity: 0.85 }}>
                    Use camera on the product label
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void pickProductPhoto()}
                  disabled={analyzingPhoto}
                  style={({ pressed }) => [
                    styles.optionButton,
                    styles.photoButton,
                    {
                      backgroundColor: palette.optionBg,
                      borderColor: palette.optionBorder,
                    },
                    analyzingPhoto && styles.buttonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={[styles.optionTitle, { color: palette.text }]}>
                    Choose from library
                  </Text>
                  <Text style={{ color: palette.subtle }}>
                    Upload an existing product photo
                  </Text>
                </Pressable>
              </View>

              {analyzingPhoto ? (
                <View style={styles.analyzingRow}>
                  <ActivityIndicator color={palette.text} />
                  <Text style={{ color: palette.muted }}>
                    Reading product label…
                  </Text>
                </View>
              ) : null}

              {photoPreview ? (
                <Image
                  source={{ uri: photoPreview }}
                  style={styles.photoPreview}
                />
              ) : null}

              <Text style={[styles.sectionLabel, { color: palette.text }]}>
                Product details
              </Text>
              <TextInput
                value={addName}
                onChangeText={setAddName}
                placeholder="Product name"
                placeholderTextColor={palette.placeholder}
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.inputBg,
                    borderColor: palette.inputBorder,
                    color: palette.inputText,
                  },
                ]}
              />
              <TextInput
                value={addBrand}
                onChangeText={setAddBrand}
                placeholder="Brand (optional)"
                placeholderTextColor={palette.placeholder}
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.inputBg,
                    borderColor: palette.inputBorder,
                    color: palette.inputText,
                  },
                ]}
              />
              <Text style={{ color: palette.muted }}>Category</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => {
                  const selected = addCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setAddCategory(cat)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? palette.primary
                            : palette.chipBg,
                          borderColor: selected
                            ? palette.primary
                            : palette.chipBorder,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: selected ? palette.primaryText : palette.text,
                          fontSize: 13,
                          textTransform: "capitalize",
                        }}
                      >
                        {cat.replace("_", " ")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={addSourcePlace}
                onChangeText={setAddSourcePlace}
                placeholder="Source place (e.g. Booker)"
                placeholderTextColor={palette.placeholder}
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.inputBg,
                    borderColor: palette.inputBorder,
                    color: palette.inputText,
                  },
                ]}
              />
              <Text style={[styles.sectionLabel, { color: palette.text }]}>
                Price & stock
              </Text>
              <Text style={{ color: palette.subtle, marginBottom: 8 }}>
                Applied to every store when you save.
              </Text>
              <View style={styles.rowFields}>
                <TextInput
                  value={addPrice}
                  onChangeText={setAddPrice}
                  placeholder="Price £ (e.g. 2.50)"
                  placeholderTextColor={palette.placeholder}
                  keyboardType="decimal-pad"
                  style={[
                    styles.input,
                    styles.halfInput,
                    {
                      backgroundColor: palette.inputBg,
                      borderColor: palette.inputBorder,
                      color: palette.inputText,
                    },
                  ]}
                />
                <TextInput
                  value={addQuantity}
                  onChangeText={setAddQuantity}
                  placeholder="Qty (e.g. 12)"
                  placeholderTextColor={palette.placeholder}
                  keyboardType="number-pad"
                  style={[
                    styles.input,
                    styles.halfInput,
                    {
                      backgroundColor: palette.inputBg,
                      borderColor: palette.inputBorder,
                      color: palette.inputText,
                    },
                  ]}
                />
              </View>
              <Pressable
                onPress={() => void addProduct()}
                disabled={adding || !addName.trim()}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: palette.primary },
                  (adding || !addName.trim()) && styles.buttonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                {adding ? (
                  <ActivityIndicator color={palette.primaryText} />
                ) : (
                  <Text
                    style={[styles.buttonText, { color: palette.primaryText }]}
                  >
                    Save product
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={resumeScanning}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: palette.muted }]}
                >
                  Scan again
                </Text>
              </Pressable>
            </View>
        </View>
      ) : null}

      {result ? (
        <View
          style={[
            styles.result,
            styles.resultCard,
            { backgroundColor: palette.card, borderColor: palette.cardBorder },
          ]}
        >
          {result.product.imageUrl ? (
            <Image
              source={{ uri: result.product.imageUrl }}
              style={styles.productImage}
            />
          ) : null}
          <Text style={[styles.productName, { color: palette.text }]}>
            {result.product.name}
          </Text>
          <Text style={{ color: palette.muted }}>
            {result.product.brand ?? "Unknown brand"} · {result.product.category}
          </Text>
          <Text style={{ color: palette.muted }}>
            Barcode {result.product.barcode}
          </Text>
          {result.availability.length === 0 ? (
            <Text style={{ color: palette.muted }}>
              In catalogue, but no stock recorded at any store yet.
            </Text>
          ) : (
            result.availability.map((a) => (
              <View
                key={a.storeId}
                style={[styles.storeRow, { borderTopColor: palette.divider }]}
              >
                <Text style={[styles.storeName, { color: palette.text }]}>
                  {a.storeName}
                </Text>
                <Text style={{ color: palette.muted }}>
                  {a.quantity} in stock · {formatPrice(a.sellPricePence)}
                </Text>
                <Text style={{ color: palette.subtle, fontSize: 13 }}>
                  {a.storeAddress}
                </Text>
              </View>
            ))
          )}

          <Pressable
            onPress={confirmDeleteProduct}
            disabled={deleting || !result.product.id}
            style={({ pressed }) => [
              styles.button,
              styles.deleteButton,
              { backgroundColor: palette.danger },
              (deleting || !result.product.id) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            {deleting ? (
              <ActivityIndicator color={palette.dangerText} />
            ) : (
              <Text style={[styles.buttonText, { color: palette.dangerText }]}>
                Delete product
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  hint: {
    marginBottom: 4,
  },
  cameraWrap: {
    height: 280,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    height: 280,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinder: {
    position: "absolute",
    left: "12%",
    right: "12%",
    top: "28%",
    bottom: "28%",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  overlayButton: {
    minWidth: 160,
  },
  permissionBox: {
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  notFoundBox: {
    marginTop: 8,
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  options: {
    gap: 10,
  },
  optionButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
  },
  optionTitle: {
    fontWeight: "700",
    fontSize: 16,
  },
  addForm: {
    gap: 10,
  },
  photoActions: {
    gap: 10,
  },
  photoButton: {
    minHeight: 64,
  },
  analyzingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  photoPreview: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#222",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  sectionLabel: {
    marginTop: 8,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  rowFields: {
    flexDirection: "row",
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  error: {
    fontWeight: "500",
  },
  result: {
    marginTop: 8,
    gap: 8,
  },
  resultCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  productImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#222",
    marginBottom: 4,
  },
  deleteButton: {
    marginTop: 12,
  },
  productName: {
    fontSize: 20,
    fontWeight: "700",
  },
  storeRow: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  storeName: {
    fontWeight: "600",
    fontSize: 16,
  },
});
