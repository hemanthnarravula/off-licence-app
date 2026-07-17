import { StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";

export default function StoresScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stores</Text>
      <Text style={styles.body}>
        High Street — 12 High Street, London SW1A 1AA
      </Text>
      <Text style={styles.body}>
        Station Road — 4 Station Road, London NW1 2DB
      </Text>
      <Text style={styles.hint}>
        Full store directory will load from the API in a later step.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  hint: {
    marginTop: 8,
    opacity: 0.6,
  },
});
