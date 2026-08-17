import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useFrierenCloud } from "@/lib/frierencloud/provider";

export default function SignInScreen() {
  const router = useRouter();
  const { signInWithGoogle, supabaseConfigured, copy } = useFrierenCloud();
  const [loading, setLoading] = useState(false);

  async function signIn() {
    try {
      setLoading(true);
      await signInWithGoogle();
      router.replace("/language" as never);
    } catch (error) {
      Alert.alert(
        "FrierenCloud",
        error instanceof Error &&
          error.message === "SUPABASE_CONFIGURATION_REQUIRED"
          ? "Google sign-in needs Supabase configuration from repository build secrets."
          : error instanceof Error
            ? error.message
            : "Unable to complete Google sign-in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.wordmark}>FrierenCloud</Text>
        <View style={styles.main}>
          <Text style={styles.title}>{copy.signInTitle}</Text>
          <Text style={styles.body}>{copy.signInBody}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={() => void signIn()}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#12213C" />
            ) : (
              <View style={styles.googleContent}>
                <FontAwesome color="#4285F4" name="google" size={19} />
                <Text style={styles.buttonText}>{copy.google}</Text>
              </View>
            )}
          </Pressable>
          {!supabaseConfigured ? (
            <Text style={styles.hint}>
              Supabase secrets have not been loaded into this build yet.
            </Text>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#12213C", flex: 1 },
  content: { flex: 1, padding: 24 },
  wordmark: {
    color: "#B9B7E8",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  main: { flex: 1, justifyContent: "center", paddingBottom: 38 },
  title: {
    color: "#F8FAFC",
    fontSize: 31,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 39,
    marginTop: 12,
  },
  body: { color: "#A7B4CC", fontSize: 16, lineHeight: 24, marginTop: 14 },
  button: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 36,
    minHeight: 54,
  },
  buttonText: { color: "#12213C", fontSize: 16, fontWeight: "800" },
  googleContent: { alignItems: "center", flexDirection: "row", gap: 10 },
  hint: {
    color: "#A7B4CC",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    textAlign: "center",
  },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.65 },
});
