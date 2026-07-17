import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";
import { apiFetch } from "@/lib/api";

type Membership = {
  id: string;
  organisationId: string;
  role: string;
  storeIds: string[] | null;
};

type MeResponse = {
  user: { id: string; email: string; name: string };
  membership: Membership;
};

type SessionContextValue = {
  loading: boolean;
  user: MeResponse["user"] | null;
  membership: Membership | null;
  storeId: string | null;
  setStoreId: (id: string | null) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const session = await authClient.getSession();
    if (!session.data?.user) {
      setUser(null);
      setMembership(null);
      setStoreId(null);
      setLoading(false);
      return;
    }

    const me = await apiFetch<MeResponse>("/api/me");
    if (!me.ok) {
      setUser({
        id: session.data.user.id,
        email: session.data.user.email,
        name: session.data.user.name,
      });
      setMembership(null);
      setStoreId(null);
      setLoading(false);
      return;
    }

    setUser(me.data.user);
    setMembership(me.data.membership);
    const ids = me.data.membership.storeIds;
    if (ids?.length === 1) {
      setStoreId(ids[0]);
    } else if (ids == null) {
      // owner: leave picker to load stores later; keep existing if still valid
      setStoreId((current) => current);
    } else if (ids.length > 1) {
      setStoreId((current) =>
        current && ids.includes(current) ? current : ids[0],
      );
    } else {
      setStoreId(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      loading,
      user,
      membership,
      storeId,
      setStoreId,
      refresh,
      signOut: async () => {
        await authClient.signOut();
        setUser(null);
        setMembership(null);
        setStoreId(null);
      },
    }),
    [loading, user, membership, storeId, refresh],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
