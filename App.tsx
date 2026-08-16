import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import { signInWithGoogle } from "./src/lib/auth";
import { getRepositoryPreference, setRepositoryPreference } from "./src/lib/preferences";
import { dispatchProvisionWorkflow, fetchWorkflowSnapshot, validateHostname } from "./src/lib/github";
import {
  getLanguagePreference,
  isSupabaseConfigured,
  saveLanguagePreference,
  supabase,
} from "./src/lib/supabase";
import { t, type SupportedLanguage } from "./src/i18n";
import type { AppRoute, VMInstance } from "./src/types";

type MainTab = "instances" | "settings";

const logo = require("./assets/icon.png");

export default function App() {
  const [route, setRoute] = useState<AppRoute>("splash");
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [tab, setTab] = useState<MainTab>("instances");
  const [repository, setRepository] = useState("MinhNekYT/App");
  const [email, setEmail] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [instances, setInstances] = useState<VMInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [volatileTokens, setVolatileTokens] = useState<Record<string, string>>({});

  const text = useMemo(() => t(language), [language]);

  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const [savedLanguage, savedRepository, sessionResult] = await Promise.all([
        getLanguagePreference(),
        getRepositoryPreference(),
        supabase.auth.getSession(),
      ]);
      if (!mounted) return;
      setRepository(savedRepository);
      if (savedLanguage) setLanguage(savedLanguage);
      const session = sessionResult.data.session;
      setEmail(session?.user.email ?? null);
      setRoute(session ? (savedLanguage ? "main" : "language") : "auth");
    }
    const timer = setTimeout(() => void hydrate(), 900);
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setEmail(session?.user.email ?? null);
      if (!session) setRoute("auth");
    });
    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function chooseLanguage(nextLanguage: SupportedLanguage) {
    setLanguage(nextLanguage);
    await saveLanguagePreference(nextLanguage);
    setRoute("main");
  }

  async function handleGoogleSignIn() {
    try {
      setLoadingAuth(true);
      await signInWithGoogle();
      const savedLanguage = await getLanguagePreference();
      setRoute(savedLanguage ? "main" : "language");
    } catch (error) {
      const message = error instanceof Error && error.message === "SUPABASE_CONFIGURATION_REQUIRED"
        ? text.notConfigured
        : error instanceof Error
          ? error.message
          : "Unable to complete Google sign-in.";
      Alert.alert("FrierenCloud", message);
    } finally {
      setLoadingAuth(false);
    }
  }

  async function saveRepository() {
    await setRepositoryPreference(repository);
    Alert.alert("FrierenCloud", "Repository preference saved.");
  }

  async function signOut() {
    setVolatileTokens({});
    setInstances([]);
    await supabase.auth.signOut();
  }

  async function createInstance(name: string, token: string) {
    const draft: VMInstance = {
      id: `${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      status: "queued",
      repository,
      logText: "Preparing a request for GitHub Actions…",
    };
    setInstances((current) => [draft, ...current]);
    setVolatileTokens((current) => ({ ...current, [draft.id]: token }));
    setSelectedInstanceId(draft.id);
    setRoute("logs");
    try {
      const dispatch = await dispatchProvisionWorkflow({ token, repository, hostname: name });
      setInstances((current) => current.map((instance) => instance.id === draft.id ? {
        ...instance,
        runId: dispatch.runId,
        logText: dispatch.runId
          ? `Workflow run ${dispatch.runId} started. Pull to refresh setup output.`
          : "Workflow accepted. GitHub is scheduling the temporary runner…",
      } : instance));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start the session.";
      setInstances((current) => current.map((instance) => instance.id === draft.id ? {
        ...instance,
        status: "failed",
        logText: message,
      } : instance));
    }
  }

  async function refreshInstance(instance: VMInstance) {
    if (!instance.runId) return;
    const token = volatileTokens[instance.id];
    if (!token) {
      throw new Error("For privacy, the GitHub token was not retained. Create a new session to view new logs.");
    }
    const snapshot = await fetchWorkflowSnapshot({ token, repository: instance.repository, runId: instance.runId });
    setInstances((current) => current.map((currentInstance) => currentInstance.id === instance.id ? {
      ...currentInstance,
      ...snapshot,
    } : currentInstance));
  }

  if (route === "splash") return <Splash />;
  if (route === "auth") {
    return <SignInScreen loading={loadingAuth} onSignIn={handleGoogleSignIn} text={text} />;
  }
  if (route === "language") {
    return <LanguageScreen onChoose={chooseLanguage} />;
  }
  if (route === "create") {
    return <CreateInstanceScreen language={language} onBack={() => setRoute("main")} onCreate={createInstance} />;
  }
  const selectedInstance = instances.find((instance) => instance.id === selectedInstanceId);
  if (route === "logs" && selectedInstance) {
    return <LogsScreen instance={selectedInstance} onBack={() => setRoute("main")} onRefresh={refreshInstance} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      {tab === "instances" ? (
        <InstancesScreen
          instances={instances}
          text={text}
          onCreate={() => setRoute("create")}
          onOpen={(instance) => { setSelectedInstanceId(instance.id); setRoute("logs"); }}
        />
      ) : (
        <SettingsScreen
          email={email}
          language={language}
          repository={repository}
          setRepository={setRepository}
          onSaveRepository={saveRepository}
          onChangeLanguage={() => setRoute("language")}
          onSignOut={signOut}
          text={text}
        />
      )}
      <BottomTabs active={tab} onChange={setTab} text={text} />
    </SafeAreaView>
  );
}

function Splash() {
  return (
    <View style={styles.splash}>
      <Image accessibilityLabel="FrierenCloud logo" source={logo} style={styles.splashLogo} />
      <Text style={styles.wordmark}>FrierenCloud</Text>
      <Text style={styles.splashSubtitle}>Secure Linux sessions</Text>
      <ActivityIndicator color={COLORS.cyan} size="small" style={styles.loader} />
    </View>
  );
}

function SignInScreen({
  loading,
  onSignIn,
  text,
}: {
  loading: boolean;
  onSignIn: () => void;
  text: ReturnType<typeof t>;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.authContent}>
        <Image accessibilityLabel="FrierenCloud logo" source={logo} style={styles.authLogo} />
        <Text style={styles.authBrand}>FrierenCloud</Text>
        <Text style={styles.authTitle}>{text.signInTitle}</Text>
        <Text style={styles.authBody}>{text.signInBody}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={onSignIn}
          style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, loading && styles.disabled]}
        >
          {loading ? <ActivityIndicator color={COLORS.navy} /> : <Text style={styles.googleText}>{text.google}</Text>}
        </Pressable>
        {!isSupabaseConfigured && <Text style={styles.configurationHint}>{text.notConfigured}</Text>}
      </View>
    </SafeAreaView>
  );
}

function LanguageScreen({ onChoose }: { onChoose: (language: SupportedLanguage) => void }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.languageContent}>
        <Text style={styles.eyebrow}>FRIERENCLOUD</Text>
        <Text style={styles.languageTitle}>Choose your language</Text>
        <Text style={styles.languageTitleVi}>Chọn ngôn ngữ</Text>
        <Text style={styles.languageBody}>You can change this at any time from Settings.</Text>
        <Pressable accessibilityRole="button" onPress={() => void onChoose("en")} style={styles.languageButton}>
          <Text style={styles.languagePrimary}>English</Text>
          <Text style={styles.languageSecondary}>Continue in English</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void onChoose("vi")} style={styles.languageButton}>
          <Text style={styles.languagePrimary}>Tiếng Việt</Text>
          <Text style={styles.languageSecondary}>Tiếp tục bằng tiếng Việt</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function InstancesScreen({
  instances,
  text,
  onCreate,
  onOpen,
}: {
  instances: VMInstance[];
  text: ReturnType<typeof t>;
  onCreate: () => void;
  onOpen: (instance: VMInstance) => void;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>FRIERENCLOUD</Text>
          <Text style={styles.screenTitle}>{text.vmInstances}</Text>
        </View>
        <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>READY</Text></View>
      </View>
      {instances.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>FC</Text></View>
          <Text style={styles.emptyTitle}>{text.noInstances}</Text>
          <Text style={styles.emptyBody}>{text.noInstancesBody}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.instanceList}>
          {instances.map((instance) => <InstanceCard key={instance.id} instance={instance} onPress={() => onOpen(instance)} />)}
        </ScrollView>
      )}
      <Pressable accessibilityRole="button" onPress={onCreate} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>{text.create}</Text>
      </Pressable>
      <Text style={styles.temporaryNote}>{text.temporary}</Text>
    </View>
  );
}

function InstanceCard({ instance, onPress }: { instance: VMInstance; onPress: () => void }) {
  const statusText = {
    queued: "QUEUED",
    provisioning: "SETTING UP",
    ready: "SSHX READY",
    failed: "FAILED",
    stopped: "STOPPED",
  }[instance.status];
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.instanceCard}>
      <View>
        <Text style={styles.instanceName}>{instance.name}</Text>
        <Text style={styles.instanceMeta}>{instance.repository}</Text>
      </View>
      <View style={styles.statusGroup}>
        <Text style={[styles.statusText, instance.status === "failed" && styles.statusFailed]}>{statusText}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

function CreateInstanceScreen({
  language,
  onBack,
  onCreate,
}: {
  language: SupportedLanguage;
  onBack: () => void;
  onCreate: (name: string, token: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isVietnamese = language === "vi";
  const title = isVietnamese ? "Tạo một Linux VPS" : "Create a Linux VPS";
  const confirm = isVietnamese ? "Xác nhận" : "Confirm";
  const agreement = isVietnamese
    ? "Tôi xác nhận rằng mã token Github tôi đã nhập không thuộc về tài khoản chính của tôi"
    : "I agree that the Github token I entered does not belong to my main account.";
  const enabled = validateHostname(name) && token.trim().length >= 20 && agreed && !submitting;

  async function submit() {
    if (!enabled) return;
    try {
      setSubmitting(true);
      await onCreate(name.trim(), token);
      setToken("");
    } catch (error) {
      Alert.alert("FrierenCloud", error instanceof Error ? error.message : "Unable to create this session.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.createScroll} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹  Back</Text></Pressable>
          <Text style={styles.eyebrow}>NEW TEMPORARY SESSION</Text>
          <Text style={styles.screenTitle}>{title}</Text>
          <Text style={styles.formLead}>{isVietnamese ? "Phiên chạy trên GitHub Actions, có thời hạn và không phải VPS lâu dài." : "Sessions run on GitHub Actions, are time-limited, and are not permanent VPS servers."}</Text>
          <Text style={styles.inputLabel}>{isVietnamese ? "Tên máy" : "Machine name"}</Text>
          <TextInput accessibilityLabel={isVietnamese ? "Tên máy" : "Machine name"} autoCapitalize="none" autoCorrect={false} onChangeText={(value) => setName(value.toLowerCase())} placeholder="frieren-dev-01" placeholderTextColor={COLORS.muted} style={styles.input} value={name} />
          <Text style={styles.fieldHint}>{isVietnamese ? "Chỉ dùng chữ thường, số và dấu gạch ngang; tối đa 63 ký tự." : "Use lowercase letters, numbers, and hyphens; up to 63 characters."}</Text>
          <Text style={styles.inputLabel}>{isVietnamese ? "Mã token GitHub" : "GitHub token"}</Text>
          <TextInput accessibilityLabel={isVietnamese ? "Mã token GitHub" : "GitHub token"} autoCapitalize="none" autoCorrect={false} onChangeText={setToken} placeholder="github_pat_..." placeholderTextColor={COLORS.muted} secureTextEntry style={styles.input} value={token} />
          <Text style={styles.fieldHint}>{isVietnamese ? "Token chỉ được giữ trong bộ nhớ tạm để gọi GitHub, không được lưu trong máy hoặc cơ sở dữ liệu." : "The token is held only in temporary memory for GitHub requests; it is never saved on device or in a database."}</Text>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => setAgreed((value) => !value)} style={styles.consentRow}>
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>{agreed && <Text style={styles.checkmark}>✓</Text>}</View>
            <Text style={styles.consentText}>{agreement}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={!enabled} onPress={() => void submit()} style={[styles.primaryButton, !enabled && styles.buttonDisabled]}>
            {submitting ? <ActivityIndicator color={COLORS.navy} /> : <Text style={styles.primaryButtonText}>{confirm}</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LogsScreen({ instance, onBack, onRefresh }: { instance: VMInstance; onBack: () => void; onRefresh: (instance: VMInstance) => Promise<void> }) {
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    try {
      setRefreshing(true);
      await onRefresh(instance);
    } catch (error) {
      Alert.alert("FrierenCloud", error instanceof Error ? error.message : "Unable to refresh workflow logs.");
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={styles.logHeader}>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹  Back</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={refreshing || !instance.runId} onPress={() => void refresh()} style={styles.refreshButton}>{refreshing ? <ActivityIndicator color={COLORS.cyan} size="small" /> : <Text style={styles.refreshText}>Refresh</Text>}</Pressable>
        </View>
        <Text style={styles.eyebrow}>SETUP LOG</Text>
        <Text style={styles.screenTitle}>{instance.name}</Text>
        <Text style={styles.logStatus}>{instance.status.toUpperCase()}</Text>
        {instance.sshxUrl ? <View style={styles.sshxCard}><Text style={styles.sshxLabel}>SSHX LINK READY</Text><Text selectable style={styles.sshxUrl}>{instance.sshxUrl}</Text></View> : null}
        <ScrollView style={styles.logPanel} contentContainerStyle={styles.logContent}><Text selectable style={styles.logText}>{instance.logText}</Text></ScrollView>
      </View>
    </SafeAreaView>
  );
}

function SettingsScreen({
  email,
  language,
  repository,
  setRepository,
  onSaveRepository,
  onChangeLanguage,
  onSignOut,
  text,
}: {
  email: string | null;
  language: SupportedLanguage;
  repository: string;
  setRepository: (value: string) => void;
  onSaveRepository: () => void;
  onChangeLanguage: () => void;
  onSignOut: () => void;
  text: ReturnType<typeof t>;
}) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.settingsScroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>FRIERENCLOUD</Text>
        <Text style={styles.screenTitle}>{text.settings}</Text>
        <View style={styles.settingsCard}>
          <Text style={styles.settingsLabel}>{text.profile}</Text>
          <Text style={styles.emailText}>{email ?? "Signed-in account"}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onChangeLanguage} style={styles.settingsCard}>
          <Text style={styles.settingsLabel}>{text.language}</Text>
          <Text style={styles.settingsValue}>{language === "en" ? "English" : "Tiếng Việt"}</Text>
        </Pressable>
        <View style={styles.settingsCard}>
          <Text style={styles.settingsLabel}>{text.repository}</Text>
          <Text style={styles.settingsCaption}>{text.repositoryHint}</Text>
          <TextInput
            accessibilityLabel={text.repository}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setRepository}
            placeholder="owner/repository"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            value={repository}
          />
          <Pressable accessibilityRole="button" onPress={onSaveRepository} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Save repository</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>{text.signOut}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BottomTabs({
  active,
  onChange,
  text,
}: {
  active: MainTab;
  onChange: (tab: MainTab) => void;
  text: ReturnType<typeof t>;
}) {
  return (
    <View style={styles.tabBar}>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: active === "instances" }} onPress={() => onChange("instances")} style={styles.tab}>
        <Text style={[styles.tabText, active === "instances" && styles.tabTextActive]}>{text.vmInstances}</Text>
      </Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: active === "settings" }} onPress={() => onChange("settings")} style={styles.tab}>
        <Text style={[styles.tabText, active === "settings" && styles.tabTextActive]}>{text.settings}</Text>
      </Pressable>
    </View>
  );
}

const COLORS = {
  navy: "#12213C",
  surface: "#1C2D4C",
  lilac: "#B9B7E8",
  cyan: "#43C6E8",
  text: "#F8FAFC",
  muted: "#A7B4CC",
  danger: "#FF9E9E",
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.navy },
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.navy, padding: 24 },
  splashLogo: { width: 168, height: 168, borderRadius: 32, marginBottom: 24 },
  wordmark: { color: COLORS.text, fontSize: 32, fontWeight: "700", letterSpacing: -0.8 },
  splashSubtitle: { color: COLORS.muted, fontSize: 14, marginTop: 8 },
  loader: { marginTop: 34 },
  authContent: { flex: 1, justifyContent: "center", padding: 24 },
  authLogo: { width: 96, height: 96, borderRadius: 20, marginBottom: 18 },
  authBrand: { color: COLORS.lilac, fontSize: 15, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  authTitle: { color: COLORS.text, fontSize: 32, lineHeight: 40, fontWeight: "700", marginTop: 12, letterSpacing: -0.7 },
  authBody: { color: COLORS.muted, fontSize: 16, lineHeight: 24, marginTop: 14, maxWidth: 340 },
  googleButton: { alignItems: "center", backgroundColor: COLORS.text, borderRadius: 16, justifyContent: "center", marginTop: 36, minHeight: 54, paddingHorizontal: 18 },
  googleText: { color: COLORS.navy, fontSize: 16, fontWeight: "700" },
  configurationHint: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 16, textAlign: "center" },
  disabled: { opacity: 0.7 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  languageContent: { flex: 1, justifyContent: "center", padding: 24 },
  eyebrow: { color: COLORS.cyan, fontSize: 12, fontWeight: "800", letterSpacing: 1.3 },
  languageTitle: { color: COLORS.text, fontSize: 30, fontWeight: "700", letterSpacing: -0.7, marginTop: 14 },
  languageTitleVi: { color: COLORS.lilac, fontSize: 22, fontWeight: "600", marginTop: 3 },
  languageBody: { color: COLORS.muted, fontSize: 15, lineHeight: 22, marginTop: 16, marginBottom: 28 },
  languageButton: { backgroundColor: COLORS.surface, borderColor: "#2B4168", borderRadius: 16, borderWidth: 1, marginTop: 12, minHeight: 78, padding: 17 },
  languagePrimary: { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  languageSecondary: { color: COLORS.muted, fontSize: 13, marginTop: 5 },
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  screenTitle: { color: COLORS.text, fontSize: 28, fontWeight: "700", letterSpacing: -0.6, marginTop: 6 },
  livePill: { alignItems: "center", backgroundColor: "#183D4A", borderRadius: 20, flexDirection: "row", gap: 6, marginTop: 3, paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { backgroundColor: COLORS.cyan, borderRadius: 4, height: 7, width: 7 },
  liveText: { color: COLORS.cyan, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  emptyState: { alignItems: "center", flex: 1, justifyContent: "center", paddingBottom: 68 },
  emptyMark: { alignItems: "center", backgroundColor: COLORS.surface, borderColor: "#2B4168", borderRadius: 28, borderWidth: 1, height: 56, justifyContent: "center", width: 56 },
  emptyMarkText: { color: COLORS.lilac, fontSize: 17, fontWeight: "800" },
  emptyTitle: { color: COLORS.text, fontSize: 21, fontWeight: "700", marginTop: 18 },
  emptyBody: { color: COLORS.muted, fontSize: 15, lineHeight: 22, marginTop: 8, maxWidth: 290, textAlign: "center" },
  instanceList: { gap: 10, paddingVertical: 22 },
  instanceCard: { alignItems: "center", backgroundColor: COLORS.surface, borderColor: "#2B4168", borderRadius: 16, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 15 },
  instanceName: { color: COLORS.text, fontSize: 16, fontWeight: "800" },
  instanceMeta: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  statusGroup: { alignItems: "flex-end", flexDirection: "row", gap: 8 },
  statusText: { color: COLORS.cyan, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  statusFailed: { color: COLORS.danger },
  chevron: { color: COLORS.muted, fontSize: 25, lineHeight: 25 },
  primaryButton: { alignItems: "center", backgroundColor: COLORS.lilac, borderRadius: 16, justifyContent: "center", minHeight: 54, paddingHorizontal: 18 },
  primaryButtonText: { color: COLORS.navy, fontSize: 16, fontWeight: "800" },
  temporaryNote: { color: COLORS.muted, fontSize: 12, marginBottom: 12, marginTop: 10, textAlign: "center" },
  tabBar: { backgroundColor: "#0E1A30", borderTopColor: "#233758", borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", minHeight: 74, paddingBottom: 12, paddingTop: 9 },
  tab: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 44 },
  tabText: { color: COLORS.muted, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: COLORS.cyan, fontWeight: "800" },
  settingsScroll: { gap: 12, paddingBottom: 26 },
  settingsCard: { backgroundColor: COLORS.surface, borderColor: "#2B4168", borderRadius: 16, borderWidth: 1, padding: 16 },
  settingsLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "800", letterSpacing: 0.7, textTransform: "uppercase" },
  emailText: { color: COLORS.text, fontSize: 16, fontWeight: "600", marginTop: 8 },
  settingsValue: { color: COLORS.lilac, fontSize: 16, fontWeight: "700", marginTop: 8 },
  settingsCaption: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  input: { backgroundColor: "#132541", borderColor: "#365077", borderRadius: 12, borderWidth: 1, color: COLORS.text, fontSize: 15, marginTop: 14, minHeight: 46, paddingHorizontal: 12 },
  secondaryButton: { alignItems: "center", borderColor: "#4E6490", borderRadius: 12, borderWidth: 1, marginTop: 10, minHeight: 42, justifyContent: "center" },
  secondaryButtonText: { color: COLORS.lilac, fontSize: 14, fontWeight: "700" },
  signOutButton: { alignItems: "center", borderColor: "#64475C", borderRadius: 14, borderWidth: 1, justifyContent: "center", minHeight: 50, marginTop: 4 },
  signOutText: { color: COLORS.danger, fontSize: 15, fontWeight: "700" },
  createScroll: { paddingBottom: 32 },
  backButton: { alignSelf: "flex-start", justifyContent: "center", marginBottom: 17, minHeight: 44 },
  backText: { color: COLORS.lilac, fontSize: 15, fontWeight: "700" },
  formLead: { color: COLORS.muted, fontSize: 15, lineHeight: 22, marginTop: 11 },
  inputLabel: { color: COLORS.text, fontSize: 14, fontWeight: "700", marginTop: 24 },
  fieldHint: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 7 },
  consentRow: { alignItems: "flex-start", flexDirection: "row", gap: 12, marginTop: 27, minHeight: 54 },
  checkbox: { alignItems: "center", borderColor: "#6A7EA2", borderRadius: 6, borderWidth: 1.5, height: 23, justifyContent: "center", marginTop: 1, width: 23 },
  checkboxChecked: { backgroundColor: COLORS.lilac, borderColor: COLORS.lilac },
  checkmark: { color: COLORS.navy, fontSize: 15, fontWeight: "900" },
  consentText: { color: COLORS.text, flex: 1, fontSize: 14, lineHeight: 20 },
  buttonDisabled: { opacity: 0.38 },
  logHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  refreshButton: { alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 72 },
  refreshText: { color: COLORS.cyan, fontSize: 14, fontWeight: "800" },
  logStatus: { color: COLORS.cyan, fontSize: 12, fontWeight: "800", letterSpacing: 0.8, marginTop: 9 },
  sshxCard: { backgroundColor: "#153948", borderColor: "#287189", borderRadius: 15, borderWidth: 1, marginTop: 18, padding: 14 },
  sshxLabel: { color: COLORS.cyan, fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  sshxUrl: { color: COLORS.text, fontSize: 14, fontWeight: "700", marginTop: 8 },
  logPanel: { backgroundColor: "#0B1426", borderColor: "#283D62", borderRadius: 15, borderWidth: 1, flex: 1, marginBottom: 18, marginTop: 18 },
  logContent: { padding: 14 },
  logText: { color: "#D8E4F5", fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }), fontSize: 12, lineHeight: 18 },
});
