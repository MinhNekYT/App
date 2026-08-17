import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { dispatchProvision, getProvisionLog } from "./github";
import { copyFor } from "./i18n";
import { isSupabaseConfigured, supabase } from "./supabase";
import type { Language, VMInstance } from "./types";

if (typeof window !== "undefined") WebBrowser.maybeCompleteAuthSession();

type FrierenCloudContextValue = {
  booting: boolean;
  signedIn: boolean;
  accountName: string | null;
  language: Language;
  hasLanguage: boolean;
  repository: string;
  instances: VMInstance[];
  copy: ReturnType<typeof copyFor>;
  supabaseConfigured: boolean;
  selectLanguage: (language: Language) => Promise<void>;
  updateRepository: (repository: string) => Promise<void>;
  signInWithDiscord: () => Promise<boolean>;
  signOut: () => Promise<void>;
  createInstance: (name: string, token: string) => Promise<string>;
  refreshInstance: (id: string) => Promise<void>;
  getInstance: (id: string) => VMInstance | undefined;
};

const FrierenCloudContext = createContext<FrierenCloudContextValue | null>(null);
const languageKey = "frierencloud.language";
const repositoryKey = "frierencloud.repository";
const instancesKey = "frierencloud.localInstances";

function readableAccountName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const metadata = user.user_metadata ?? {};
  const candidates = [
    metadata.full_name,
    metadata.global_name,
    metadata.name,
    metadata.user_name,
    user.email,
  ];
  return candidates.find((value): value is string => typeof value === "string" && value.length > 0) ?? null;
}

function parseStoredInstances(value: string | null): VMInstance[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as VMInstance[]) : [];
  } catch {
    return [];
  }
}

export function FrierenCloudProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [hasLanguage, setHasLanguage] = useState(false);
  const [repository, setRepository] = useState(
    process.env.EXPO_PUBLIC_GITHUB_REPOSITORY ?? "MinhNekYT/App",
  );
  const [instances, setInstances] = useState<VMInstance[]>([]);
  const [volatileTokens, setVolatileTokens] = useState<Record<string, string>>({});

  const persistInstances = useCallback((next: VMInstance[]) => {
    setInstances(next);
    void AsyncStorage.setItem(instancesKey, JSON.stringify(next));
  }, []);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const [storedLanguage, storedRepository, storedInstances, sessionResult] =
        await Promise.all([
          AsyncStorage.getItem(languageKey),
          AsyncStorage.getItem(repositoryKey),
          AsyncStorage.getItem(instancesKey),
          supabase.auth.getSession(),
        ]);
      if (!mounted) return;
      if (storedLanguage === "en" || storedLanguage === "vi") {
        setLanguage(storedLanguage);
        setHasLanguage(true);
      }
      if (storedRepository) setRepository(storedRepository);
      setInstances(parseStoredInstances(storedInstances));
      const session = sessionResult.data.session;
      setSignedIn(Boolean(session));
      setAccountName(session ? readableAccountName(session.user) : null);
      setBooting(false);
    }
    void hydrate();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSignedIn(Boolean(session));
      setAccountName(session ? readableAccountName(session.user) : null);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const selectLanguage = useCallback(async (next: Language) => {
    setLanguage(next);
    setHasLanguage(true);
    await AsyncStorage.setItem(languageKey, next);
  }, []);

  const updateRepository = useCallback(async (next: string) => {
    const value = next.trim();
    setRepository(value);
    await AsyncStorage.setItem(repositoryKey, value);
  }, []);

  const signInWithDiscord = useCallback(async () => {
    if (!isSupabaseConfigured) throw new Error("SUPABASE_CONFIGURATION_REQUIRED");
    const redirectTo = Linking.createURL("auth/callback");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error("Discord sign-in URL was not returned.");
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) return false;
    const code = new URL(result.url).searchParams.get("code");
    if (!code) throw new Error("Discord sign-in did not return an authorization code.");
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return true;
  }, []);

  const signOut = useCallback(async () => {
    setVolatileTokens({});
    await supabase.auth.signOut();
    router.replace("/");
  }, [router]);

  const createInstance = useCallback(
    async (name: string, token: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const draft: VMInstance = {
        id,
        name,
        repository,
        createdAt: new Date().toISOString(),
        status: "queued",
        logText: "Preparing a request for GitHub Actions…",
      };
      persistInstances([draft, ...instances]);
      setVolatileTokens((current) => ({ ...current, [id]: token }));
      try {
        const runId = await dispatchProvision({ token, repository, hostname: name });
        persistInstances(
          [draft, ...instances].map((instance) =>
            instance.id === id
              ? {
                  ...instance,
                  runId,
                  logText: runId
                    ? `Workflow run ${runId} started. Refresh to retrieve setup output.`
                    : "Workflow accepted. GitHub is scheduling the runner…",
                }
              : instance,
          ),
        );
      } catch (error) {
        persistInstances(
          [draft, ...instances].map((instance) =>
            instance.id === id
              ? {
                  ...instance,
                  status: "failed",
                  logText: error instanceof Error ? error.message : "Unable to start the Linux session.",
                }
              : instance,
          ),
        );
      }
      return id;
    },
    [instances, persistInstances, repository],
  );

  const refreshInstance = useCallback(
    async (id: string) => {
      const instance = instances.find((item) => item.id === id);
      const token = volatileTokens[id];
      if (!instance?.runId || !token) {
        throw new Error(
          "Re-enter a secondary GitHub token in a new session to refresh logs. Tokens are never saved on this device.",
        );
      }
      const update = await getProvisionLog({
        token,
        repository: instance.repository,
        runId: instance.runId,
      });
      persistInstances(
        instances.map((item) => (item.id === id ? { ...item, ...update } : item)),
      );
    },
    [instances, persistInstances, volatileTokens],
  );

  const value = useMemo(
    () => ({
      booting,
      signedIn,
      accountName,
      language,
      hasLanguage,
      repository,
      instances,
      copy: copyFor(language),
      supabaseConfigured: isSupabaseConfigured,
      selectLanguage,
      updateRepository,
      signInWithDiscord,
      signOut,
      createInstance,
      refreshInstance,
      getInstance: (id: string) => instances.find((item) => item.id === id),
    }),
    [
      accountName,
      booting,
      createInstance,
      hasLanguage,
      instances,
      language,
      refreshInstance,
      repository,
      selectLanguage,
      signInWithDiscord,
      signOut,
      signedIn,
      updateRepository,
    ],
  );

  return <FrierenCloudContext.Provider value={value}>{children}</FrierenCloudContext.Provider>;
}

export function useFrierenCloud() {
  const context = useContext(FrierenCloudContext);
  if (!context) throw new Error("useFrierenCloud must be used within FrierenCloudProvider.");
  return context;
}
