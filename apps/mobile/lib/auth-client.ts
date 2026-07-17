import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const baseURL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL,
  plugins:
    Platform.OS === "web"
      ? []
      : [
          expoClient({
            scheme: "mobile",
            storagePrefix: "offlicence",
            storage: SecureStore,
          }),
        ],
});
