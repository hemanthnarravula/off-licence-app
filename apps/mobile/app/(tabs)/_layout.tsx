import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useSession } from "@/lib/session";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { membership } = useSession();
  const role = membership?.role;
  const isOwnerOrManager = role === "owner" || role === "manager";
  const isStaff = role === "staff";
  const isCustomer = role === "customer";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "barcode.viewfinder", android: "qr_code", web: "qr_code" }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          href: isStaff ? undefined : null,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "shippingbox", android: "inventory", web: "inventory" }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          href: isCustomer ? null : undefined,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "list.bullet", android: "list", web: "list" }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          href: isOwnerOrManager ? undefined : null,
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "tag", android: "sell", web: "sell" }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "ellipsis.circle",
                android: "more",
                web: "more",
              }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
