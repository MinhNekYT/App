import { describe, expect, it } from "vitest";
import { formatAuditCommand, redactCommandOptions } from "./audit";

describe("command audit redaction", () => {
  it("redacts secrets while retaining non-sensitive operational context", () => {
    const options = redactCommandOptions([{ name: "github_token", value: "ghp_secret" }, { name: "hostname", value: "ubuntu-01" }, { name: "webhook_url", value: "https://discord.com/api/webhooks/1/secret" }]);
    expect(options).toEqual([{ name: "github_token", value: "[redacted]", options: undefined }, { name: "hostname", value: "ubuntu-01", options: undefined }, { name: "webhook_url", value: "[redacted]", options: undefined }]);
    expect(formatAuditCommand({ userId: "42", userTag: "owner", commandName: "token", options })).not.toContain("ghp_secret");
  });
});
