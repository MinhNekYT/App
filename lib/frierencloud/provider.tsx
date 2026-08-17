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

import { copyFor } from "./i18n";
import {
  createSharedInstance,
  isBridgeConfigured,
  listSharedInstances,
  refreshSharedInstance,
} from "./bridge";
import { isSupabaseConfigured, supabase } from "./supabase";
import type { Language, VMInstance } from "./types";

if (typeof window !== "undefined") {
  WebBrowser.maybeCompleteAuthSession();
}

type FrierenCloudContextValue = {
  booting: boolean;
  signedIn: boolean;
  email: string | null;
  language: Language;
  hasLanguage: boolean;
  repository: string;
  instances: VMInstance[];
  copy: ReturnType<typeof copyFor>;
  supabaseConfigured: boolean;
  bridgeConfigured: boolean;
  selectLanguage: (language: Language) => Promise<void>;
  updateRepository: (repository: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  createInstance: (name: string, token: string) => Promise<string>;
  refreshInstance: (id: string) => Promise<void>;
  getInstance: (id: string) => VMInstance | undefined;
};

const FrierenCloudContext = createContext<FrierenCloudContextValue | null>(
  null,
);
const languageKey = "frierencloud.language";
const repositoryKey = "frierencloud.repository";

export function FrierenCloudProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [hasLanguage, setHasLanguage] = useState(false);
  const [repository, setRepository] = useState(
    process.env.EXPO_PUBLIC_GITHUB_REPOSITORY ?? "MinhNekYT/App",
  );
  const [instances, setInstances] = useState<VMInstance[]>([]);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const [storedLanguage, storedRepository, sessionResult] =
        await Promise.all([
          AsyncStorage.getItem(languageKey),
          AsyncStorage.getItem(repositoryKey),
          supabase.auth.getSession(),
        ]);
      if (!mounted) return;
      if (storedLanguage === "en" || storedLanguage === "vi") {
        setLanguage(storedLanguage);
        setHasLanguage(true);
      }
      if (storedRepository) setRepository(storedRepository);
      const session = sessionResult.data.session;
      setSignedIn(Boolean(session));
      setEmail(session?.user.email ?? null);
      if (session?.access_token && isBridgeConfigured) {
        const remote = await listSharedInstances(session.access_token).catch(
          () => [],
        );
        if (mounted) setInstances(remote);
      }
      setBooting(false);
    }
    void hydrate();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSignedIn(Boolean(session));
      setEmail(session?.user.email ?? null);
      if (session?.access_token && isBridgeConfigured) {
        void listSharedInstances(session.access_token)
          .then((remote) => mounted && setInstances(remote))
          .catch(() => undefined);
      }
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const selectLanguage = useCallback(async (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setHasLanguage(true);
    await AsyncStorage.setItem(languageKey, nextLanguage);
  }, []);

  const updateRepository = useCallback(async (nextRepository: string) => {
    const normalized = nextRepository.trim();
    setRepository(normalized);
    await AsyncStorage.setItem(repositoryKey, normalized);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured)
      throw new Error("SUPABASE_CONFIGURATION_REQUIRED");
    const redirectTo = Linking.createURL("auth/callback");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error("Google sign-in URL was not returned.");
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) return;
    const code = new URL(result.url).searchParams.get("code");
    if (!code)
      throw new Error("Google sign-in did not return an authorization code.");
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  }, []);

  const signOut = useCallback(async () => {
    setInstances([]);
    await supabase.auth.signOut();
    router.replace("/");
  }, [router]);

  const createInstance = useCallback(
    async (name: string, token: string) => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token)
        throw new Error("Please sign in again before creating a session.");
      const instance = await createSharedInstance(data.session.access_token, {
        hostname: name,
        repository,
        secondaryGithubToken: token,
      });
      setInstances((current) => [instance, ...current]);
      return instance.id;
    },
    [repository],
  );

  const refreshInstance = useCallback(async (id: string) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token)
      throw new Error("Please sign in again before refreshing setup logs.");
    const update = await refreshSharedInstance(data.session.access_token, id);
    setInstances((current) =>
      current.map((item) => (item.id === id ? { ...item, ...update } : item)),
    );
  }, []);

  const value = useMemo(
    () => ({
      booting,
      signedIn,
      email,
      language,
      hasLanguage,
      repository,
      instances,
      copy: copyFor(language),
      supabaseConfigured: isSupabaseConfigured,
      bridgeConfigured: isBridgeConfigured,
      selectLanguage,
      updateRepository,
      signInWithGoogle,
      signOut,
      createInstance,
      refreshInstance,
      getInstance: (id: string) =>
        instances.find((instance) => instance.id === id),
    }),
    [
      booting,
      signedIn,
      email,
      language,
      hasLanguage,
      repository,
      instances,
      selectLanguage,
      updateRepository,
      signInWithGoogle,
      signOut,
      createInstance,
      refreshInstance,
    ],
  );

  return (
    <FrierenCloudContext.Provider value={value}>
      {children}
    </FrierenCloudContext.Provider>
  );
}

export function useFrierenCloud() {
  const context = useContext(FrierenCloudContext);
  if (!context)
    throw new Error(
      "useFrierenCloud must be used within FrierenCloudProvider.",
    );
  return context;
}
