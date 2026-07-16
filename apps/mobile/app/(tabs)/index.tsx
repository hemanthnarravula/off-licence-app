import { StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { roleSchema } from "@offlicence/shared";

export default function HomeScreen() {
  const roles = roleSchema.options.join(" · ");

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Off-licence</Text>
      <Text style={styles.title}>Mobile scaffold</Text>
      <Text style={styles.body}>
        Bare Expo Router app. Staff, customer, and owner light flows build here.
      </Text>
      <Text style={styles.meta}>Roles: {roles}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.55,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.75,
  },
  meta: {
    marginTop: 12,
    fontSize: 13,
    opacity: 0.55,
  },
});
