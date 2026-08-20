export const auditLogChannelSettingKey = "discord_audit_log_channel";
const SECRET_OPTION_NAMES = new Set(["github_token", "webhook_url", "sig", "signature", "token", "password"]);
export type AuditOption = { name: string; value?: unknown; options?: AuditOption[] };
type RedactedAuditOption = { name: string; value?: string; options?: RedactedAuditOption[] };

export function redactCommandOptions(options: AuditOption[]): RedactedAuditOption[] {
  return options.map(option => ({
    name: option.name,
    value: SECRET_OPTION_NAMES.has(option.name) ? "[redacted]" : option.value === undefined ? undefined : String(option.value).slice(0, 120),
    options: option.options ? redactCommandOptions(option.options) : undefined,
  }));
}

export function formatAuditCommand(input: { userId: string; userTag: string; commandName: string; options: AuditOption[] }) {
  const serialized = redactCommandOptions(input.options).map(option => {
    const child = option.options?.map(nested => `${nested.name}=${nested.value ?? ""}`).join(" ");
    return `${option.name}${option.value !== undefined ? `=${option.value}` : ""}${child ? ` ${child}` : ""}`;
  }).join(" ");
  return `Command audit · <@${input.userId}> (${input.userTag}) ran /${input.commandName}${serialized ? ` ${serialized}` : ""}`;
}
