import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSession } from "@/lib/session";

const dashboardUrl =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export default function MoreScreen() {
  const { user, membership, storeId, signOut } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>More</Text>
      <Text style={styles.meta}>{user?.email}</Text>
      <Text style={styles.meta}>
        Role: {membership?.role ?? "none"}
        {storeId ? ` · store ${storeId.slice(0, 8)}…` : ""}
      </Text>

      {(membership?.role === "owner" || membership?.role === "manager") && (
        <Pressable
          style={styles.button}
          onPress={() => void Linking.openURL(`${dashboardUrl}/dashboard`)}
        >
          <Text style={styles.buttonText}>Open web dashboard</Text>
        </Pressable>
      )}

      <Pressable style={styles.secondary} onPress={() => void signOut()}>
        <Text style={styles.secondaryText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 10,
    justifyContent: "center",
  },
  title: { fontSize: 28, fontWeight: "700" },
  meta: { color: "#52525b", fontSize: 14 },
  button: {
    marginTop: 12,
    backgroundColor: "#18181b",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  secondary: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  secondaryText: { fontWeight: "600" },
});
