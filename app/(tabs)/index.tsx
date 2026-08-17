import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useFrierenCloud } from "@/lib/frierencloud/provider";
import type { InstanceStatus, VMInstance } from "@/lib/frierencloud/types";

const statusCopy: Record<InstanceStatus, string> = {
  queued: "QUEUED",
  provisioning: "SETTING UP",
  ready: "SSHX READY",
  failed: "FAILED",
  stopped: "STOPPED",
};

export default function InstancesScreen() {
  const router = useRouter();
  const { instances, copy } = useFrierenCloud();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>FRIERENCLOUD</Text>
            <Text style={styles.title}>{copy.vmInstances}</Text>
          </View>
          <View style={styles.readyPill}>
            <View style={styles.readyDot} />
            <Text style={styles.readyText}>READY</Text>
          </View>
        </View>
        {instances.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>FC</Text>
            </View>
            <Text style={styles.emptyTitle}>{copy.noInstances}</Text>
            <Text style={styles.emptyBody}>{copy.noInstancesBody}</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                onPress={() => router.push(`/logs/${instance.id}` as never)}
              />
            ))}
          </ScrollView>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/create" as never)}
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.pressed,
          ]}
        >
          <Feather color="#12213C" name="plus" size={20} />
          <Text style={styles.createText}>{copy.createLinuxVps}</Text>
        </Pressable>
        <Text style={styles.temporary}>{copy.temporary}</Text>
      </View>
    </SafeAreaView>
  );
}

function InstanceCard({
  instance,
  onPress,
}: {
  instance: VMInstance;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View>
        <Text style={styles.cardName}>{instance.name}</Text>
        <Text style={styles.cardMeta}>{instance.repository}</Text>
      </View>
      <View style={styles.cardState}>
        <Text
          style={[
            styles.status,
            instance.status === "failed" && styles.statusFailed,
          ]}
        >
          {statusCopy[instance.status]}
        </Text>
        <Feather color="#A7B4CC" name="chevron-right" size={19} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#12213C", flex: 1 },
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 18 },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#43C6E8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 29,
    fontWeight: "700",
    letterSpacing: -0.7,
    marginTop: 6,
  },
  readyPill: {
    alignItems: "center",
    backgroundColor: "#183D4A",
    borderRadius: 18,
    flexDirection: "row",
    gap: 6,
    marginTop: 3,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  readyDot: {
    backgroundColor: "#43C6E8",
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  readyText: {
    color: "#43C6E8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 72,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: "#1C2D4C",
    borderColor: "#2B4168",
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  emptyIconText: { color: "#B9B7E8", fontSize: 17, fontWeight: "800" },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 21,
    fontWeight: "700",
    marginTop: 18,
  },
  emptyBody: {
    color: "#A7B4CC",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 292,
    textAlign: "center",
  },
  list: { gap: 10, paddingVertical: 22 },
  card: {
    alignItems: "center",
    backgroundColor: "#1C2D4C",
    borderColor: "#2B4168",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
  },
  cardName: { color: "#F8FAFC", fontSize: 16, fontWeight: "800" },
  cardMeta: { color: "#A7B4CC", fontSize: 12, marginTop: 5 },
  cardState: { alignItems: "center", flexDirection: "row", gap: 5 },
  status: {
    color: "#43C6E8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusFailed: { color: "#FF9E9E" },
  createButton: {
    alignItems: "center",
    backgroundColor: "#B9B7E8",
    borderRadius: 16,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 54,
  },
  createText: { color: "#12213C", fontSize: 16, fontWeight: "800" },
  temporary: {
    color: "#A7B4CC",
    fontSize: 12,
    marginBottom: 12,
    marginTop: 10,
    textAlign: "center",
  },
  pressed: { opacity: 0.86 },
});
