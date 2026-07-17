import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/lib/session";

export default function LoginScreen() {
  const { refresh } = useSession();
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("password123");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("Staff User");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    setPending(true);
    setError(null);
    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        });
        if (result.error) {
          setError(result.error.message ?? "Sign up failed");
          setPending(false);
          return;
        }
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) {
          setError(result.error.message ?? "Sign in failed");
          setPending(false);
          return;
        }
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Off-licence</Text>
      <Text style={styles.title}>
        {mode === "sign-in" ? "Staff sign in" : "Create account"}
      </Text>
      <Text style={styles.body}>
        Scan, count stock, and request replenishment for your store.
      </Text>

      {mode === "sign-up" ? (
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Name"
          autoCapitalize="words"
        />
      ) : null}
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={() => void onSubmit()}
        disabled={pending}
      >
        {pending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {mode === "sign-in" ? "Sign in" : "Sign up"}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() =>
          setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"))
        }
      >
        <Text style={styles.switch}>
          {mode === "sign-in"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
    backgroundColor: "#fafafa",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#71717a",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#18181b",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#52525b",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#18181b",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  switch: { color: "#52525b", textDecorationLine: "underline", marginTop: 8 },
  error: {
    color: "#b91c1c",
    backgroundColor: "#fef2f2",
    padding: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
});
