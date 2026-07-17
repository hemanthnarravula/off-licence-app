import "react-native-gesture-handler";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

import { SessionProvider, useSession } from "@/lib/session";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#fafafa",
    card: "#ffffff",
    text: "#18181b",
    border: "#e4e4e7",
    primary: "#18181b",
  },
};

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, user } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const onLogin = segments[0] === "login";
    if (!user && !onLogin) {
      router.replace("/login");
      return;
    }
    if (user && onLogin) {
      router.replace("/(tabs)/scan");
    }
  }, [loading, user, segments, router]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fafafa",
        }}
      >
        <ActivityIndicator color="#18181b" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <ThemeProvider value={AppTheme}>
          <AuthGate>
            <Stack
              screenOptions={{
                contentStyle: { backgroundColor: "#fafafa" },
                headerStyle: { backgroundColor: "#ffffff" },
                headerTitleStyle: { color: "#18181b" },
              }}
            >
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: "modal" }} />
            </Stack>
          </AuthGate>
        </ThemeProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
