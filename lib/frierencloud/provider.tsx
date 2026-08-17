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

import {
  createSharedInstance,
  discordAuthorizationUrl,
  getDiscordProfile,
  isBridgeConfigured,
  listSharedInstances,
  refreshSharedInstance,
  type DiscordProfile,
} from "./bridge";
import { copyFor } from "./i18n";
import { discordSession } from "./session";
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
  bridgeConfigured: boolean;
  selectLanguage: (language: Language) => Promise<void>;
  updateRepository: (repository: string) => Promise<void>;
  signInWithDiscord: () => Promise<boolean>;
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
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<DiscordProfile | null>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [hasLanguage, setHasLanguage] = useState(false);
  const [repository, setRepository] = useState(
    process.env.EXPO_PUBLIC_GITHUB_REPOSITORY ?? "MinhNekYT/App",
  );
  const [instances, setInstances] = useState<VMInstance[]>([]);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const [storedLanguage, storedRepository, token] = await Promise.all([
        AsyncStorage.getItem(languageKey),
        AsyncStorage.getItem(repositoryKey),
        discordSession.get(),
      ]);
      if (!mounted) return;
      if (storedLanguage === "en" || storedLanguage === "vi") {
        setLanguage(storedLanguage);
        setHasLanguage(true);
      }
      if (storedRepository) setRepository(storedRepository);
      if (token && isBridgeConfigured) {
        const user = await getDiscordProfile(token).catch(() => null);
        if (user) {
          const remote = await listSharedInstances(token).catch(() => []);
          if (mounted) {
            setSessionToken(token);
            setProfile(user);
            setInstances(remote);
          }
        } else await discordSession.clear();
      }
      if (mounted) setBooting(false);
    }
    void hydrate();
    return () => {
      mounted = false;
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
    const redirectUri = Linking.createURL("auth/discord");
    const result = await WebBrowser.openAuthSessionAsync(
      discordAuthorizationUrl(redirectUri),
      redirectUri,
    );
    if (result.type !== "success" || !result.url) return false;
    const token = new URL(result.url).searchParams.get("token");
    if (!token) throw new Error("Discord sign-in did not return a session.");
    const user = await getDiscordProfile(token);
    await discordSession.set(token);
    setSessionToken(token);
    setProfile(user);
    const remote = await listSharedInstances(token).catch(() => []);
    setInstances(remote);
    return true;
  }, []);

  const signOut = useCallback(async () => {
    setSessionToken(null);
    setProfile(null);
    setInstances([]);
    await discordSession.clear();
    router.replace("/");
  }, [router]);
  const requireSession = useCallback(() => {
    if (!sessionToken) throw new Error("Please sign in with Discord again.");
    return sessionToken;
  }, [sessionToken]);
  const createInstance = useCallback(
    async (name: string, token: string) => {
      const instance = await createSharedInstance(requireSession(), {
        hostname: name,
        repository,
        secondaryGithubToken: token,
      });
      setInstances((current) => [instance, ...current]);
      return instance.id;
    },
    [repository, requireSession],
  );
  const refreshInstance = useCallback(
    async (id: string) => {
      const update = await refreshSharedInstance(requireSession(), id);
      setInstances((current) =>
        current.map((item) => (item.id === id ? { ...item, ...update } : item)),
      );
    },
    [requireSession],
  );

  const value = useMemo(
    () => ({
      booting,
      signedIn: Boolean(sessionToken),
      accountName: profile?.username ?? null,
      language,
      hasLanguage,
      repository,
      instances,
      copy: copyFor(language),
      bridgeConfigured: isBridgeConfigured,
      selectLanguage,
      updateRepository,
      signInWithDiscord,
      signOut,
      createInstance,
      refreshInstance,
      getInstance: (id: string) => instances.find((item) => item.id === id),
    }),
    [
      booting,
      sessionToken,
      profile,
      language,
      hasLanguage,
      repository,
      instances,
      selectLanguage,
      updateRepository,
      signInWithDiscord,
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
