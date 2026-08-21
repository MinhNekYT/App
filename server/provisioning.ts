import * as db from "./db";
import { createVmLogSignature, dispatchWorkflow, GITHUB_ACCOUNT_ACCESS_ERROR, validateLinuxHostname } from "./github";
import { decryptGithubToken, githubTokenSettingKey } from "./githubToken";
import { botConfig } from "../bot/config";

export const VPS_COST = 2;

function runner() {
  const value = botConfig.defaultRunner;
  if (!value.githubOwner || !value.githubRepo) throw new Error("GitHub runner is not configured.");
  return value;
}

async function dispatchToken() {
  const stored = await db.getBotSetting(githubTokenSettingKey);
  if (!stored) throw new Error(GITHUB_ACCOUNT_ACCESS_ERROR);
  try {
    return decryptGithubToken(stored);
  } catch {
    throw new Error(GITHUB_ACCOUNT_ACCESS_ERROR);
  }
}

export async function provisionVps(input: { userId: number; hostname?: string | null; ubuntuVersion: "22.04" | "24.04" | "26.04" }) {
  const hostname = validateLinuxHostname(input.hostname?.trim() || "frierencloud");
  if (!await db.reserveCoinsForVps({ userId: input.userId, cost: VPS_COST })) throw new Error(`You need ${VPS_COST} coins to create a VPS.`);
  try {
    const configuredRunner = runner();
    const vm = await db.createVmInstance({ userId: input.userId, hostname, ubuntuVersion: input.ubuntuVersion, githubOwner: configuredRunner.githubOwner!, githubRepo: configuredRunner.githubRepo!, workflowFile: configuredRunner.workflowFile });
    await db.appendVmLog(vm.id, `Provisioning requested for hostname ${hostname}.`);
    const callbackUrl = `${botConfig.publicBaseUrl}/api/vm-logs/${vm.id}?sig=${createVmLogSignature(vm.id)}`;
    const antiminingUrl = `${botConfig.publicBaseUrl}/api/antimining/${vm.id}?sig=${createVmLogSignature(vm.id)}`;
    const run = await dispatchWorkflow({ owner: configuredRunner.githubOwner!, repo: configuredRunner.githubRepo!, workflowFile: configuredRunner.workflowFile, ref: configuredRunner.ref, hostname, ubuntuVersion: input.ubuntuVersion, callbackUrl, antiminingUrl, token: await dispatchToken() });
    await db.updateVmFromCallback(vm.id, { workflowRunId: String(run.runId ?? ""), status: "running" });
    await db.appendVmLog(vm.id, "GitHub Actions workflow dispatched successfully.");
    return { ...(await db.getVmById(vm.id))!, refunded: false };
  } catch (error) {
    await db.addCoins({ userId: input.userId, actorUserId: input.userId, amount: VPS_COST, reason: "vps_create_refund" });
    throw error;
  }
}
