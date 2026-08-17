import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { WebShell } from "@/components/frierencloud/web-shell";
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
  const { width } = useWindowDimensions();
  const isPhone = width < 720;
  const isWide = width >= 1100;

  const create = () => router.push("/create" as never);
  const createAction = (
    <Pressable accessibilityRole="button" onPress={create} style={styles.compactCreate}>
      <Feather color="#101D35" name="plus" size={20} />
    </Pressable>
  );

  return (
    <WebShell action={createAction} active="instances">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, isWide && styles.heroWide]}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>FRIERENCLOUD / WORKSPACES</Text>
            <Text style={[styles.title, !isPhone && styles.titleLarge]}>{copy.vmInstances}</Text>
            <Text style={styles.lead}>
              Create temporary Linux workspaces on GitHub Actions and open them from SSHX.
            </Text>
          </View>
          {!isPhone ? (
            <Pressable accessibilityRole="button" onPress={create} style={styles.createButton}>
              <Feather color="#101D35" name="plus" size={20} />
              <Text style={styles.createText}>{copy.createLinuxVps}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.contentGrid, isWide && styles.contentGridWide]}>
          <View style={styles.instancePanel}>
            <View style={styles.panelHeading}>
              <View>
                <Text style={styles.panelTitle}>Your sessions</Text>
                <Text style={styles.panelCaption}>
                  {instances.length === 0 ? "No active workspace yet" : `${instances.length} local workspace${instances.length === 1 ? "" : "s"}`}
                </Text>
              </View>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>DIRECT</Text>
              </View>
            </View>

            {instances.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Feather color="#B9B7E8" name="server" size={25} />
                </View>
                <Text style={styles.emptyTitle}>{copy.noInstances}</Text>
                <Text style={styles.emptyBody}>{copy.noInstancesBody}</Text>
                <Pressable accessibilityRole="button" onPress={create} style={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>{copy.createLinuxVps}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.list}>
                {instances.map((instance) => (
                  <InstanceCard
                    instance={instance}
                    key={instance.id}
                    onPress={() => router.push(`/logs/${instance.id}` as never)}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.infoPanel}>
            <Text style={styles.infoEyebrow}>HOW IT WORKS</Text>
            <Text style={styles.infoTitle}>One temporary session at a time.</Text>
            <View style={styles.infoStep}>
              <Text style={styles.stepNumber}>01</Text>
              <Text style={styles.stepText}>Enter a safe hostname and a secondary GitHub token.</Text>
            </View>
            <View style={styles.infoStep}>
              <Text style={styles.stepNumber}>02</Text>
              <Text style={styles.stepText}>GitHub Actions prepares a Linux runner and starts SSHX.</Text>
            </View>
            <View style={styles.infoStep}>
              <Text style={styles.stepNumber}>03</Text>
              <Text style={styles.stepText}>Refresh the setup log and open the SSHX URL when it appears.</Text>
            </View>
            <Text style={styles.infoFootnote}>{copy.temporary}</Text>
          </View>
        </View>
      </ScrollView>
    </WebShell>
  );
}

function InstanceCard({ instance, onPress }: { instance: VMInstance; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardIcon}>
        <Feather color="#7FE1F6" name="terminal" size={19} />
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardName}>{instance.name}</Text>
        <Text numberOfLines={1} style={styles.cardMeta}>{instance.repository}</Text>
      </View>
      <View style={styles.cardState}>
        <Text style={[styles.status, instance.status === "failed" && styles.statusFailed]}>{statusCopy[instance.status]}</Text>
        <Feather color="#A7B4CC" name="chevron-right" size={20} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, gap: 24, paddingBottom: 34 },
  hero: { gap: 18 },
  heroWide: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" },
  heroCopy: { maxWidth: 670 },
  eyebrow: { color: "#7FE1F6", fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#F5F8FF", fontSize: 32, fontWeight: "800", letterSpacing: -1, marginTop: 8 },
  titleLarge: { fontSize: 42, letterSpacing: -1.5 },
  lead: { color: "#A9B7D0", fontSize: 15, lineHeight: 23, marginTop: 10, maxWidth: 560 },
  compactCreate: { alignItems: "center", backgroundColor: "#B9B7E8", borderRadius: 11, height: 38, justifyContent: "center", width: 38 },
  createButton: { alignItems: "center", backgroundColor: "#B9B7E8", borderRadius: 14, flexDirection: "row", gap: 9, justifyContent: "center", minHeight: 50, paddingHorizontal: 18 },
  createText: { color: "#101D35", fontSize: 15, fontWeight: "900" },
  contentGrid: { gap: 20 },
  contentGridWide: { alignItems: "stretch", flexDirection: "row" },
  instancePanel: { backgroundColor: "#172743", borderColor: "#2D456D", borderRadius: 20, borderWidth: 1, flex: 1, minHeight: 410, padding: 20 },
  panelHeading: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  panelTitle: { color: "#F5F8FF", fontSize: 18, fontWeight: "800" },
  panelCaption: { color: "#8EA0BF", fontSize: 13, marginTop: 5 },
  livePill: { alignItems: "center", backgroundColor: "#153948", borderRadius: 999, flexDirection: "row", gap: 6, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { backgroundColor: "#7FE1F6", borderRadius: 4, height: 7, width: 7 },
  liveText: { color: "#7FE1F6", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  emptyState: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 18 },
  emptyIcon: { alignItems: "center", backgroundColor: "#203A5B", borderRadius: 18, height: 56, justifyContent: "center", width: 56 },
  emptyTitle: { color: "#F5F8FF", fontSize: 20, fontWeight: "800", marginTop: 18 },
  emptyBody: { color: "#A9B7D0", fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 340, textAlign: "center" },
  emptyButton: { backgroundColor: "#B9B7E8", borderRadius: 11, marginTop: 20, paddingHorizontal: 15, paddingVertical: 11 },
  emptyButtonText: { color: "#101D35", fontSize: 13, fontWeight: "900" },
  list: { gap: 10, marginTop: 20 },
  card: { alignItems: "center", backgroundColor: "#13223C", borderColor: "#2B4267", borderRadius: 14, borderWidth: 1, flexDirection: "row", minHeight: 76, padding: 12 },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  cardIcon: { alignItems: "center", backgroundColor: "#183D4A", borderRadius: 11, height: 42, justifyContent: "center", width: 42 },
  cardCopy: { flex: 1, marginLeft: 12, minWidth: 0 },
  cardName: { color: "#F5F8FF", fontSize: 15, fontWeight: "800" },
  cardMeta: { color: "#8EA0BF", fontSize: 12, marginTop: 4 },
  cardState: { alignItems: "center", flexDirection: "row", gap: 8 },
  status: { color: "#7FE1F6", fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  statusFailed: { color: "#FF9E9E" },
  infoPanel: { backgroundColor: "#0E1A30", borderColor: "#263A5B", borderRadius: 20, borderWidth: 1, maxWidth: 370, padding: 22, width: "100%" },
  infoEyebrow: { color: "#B9B7E8", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  infoTitle: { color: "#F5F8FF", fontSize: 19, fontWeight: "800", lineHeight: 26, marginTop: 10 },
  infoStep: { flexDirection: "row", gap: 11, marginTop: 19 },
  stepNumber: { color: "#7FE1F6", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  stepText: { color: "#A9B7D0", flex: 1, fontSize: 13, lineHeight: 19 },
  infoFootnote: { borderTopColor: "#263A5B", borderTopWidth: 1, color: "#8293B0", fontSize: 12, lineHeight: 18, marginTop: 22, paddingTop: 15 },
});
