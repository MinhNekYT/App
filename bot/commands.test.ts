import { describe, expect, it } from "vitest";
import { commandBuilders } from "./commands";

describe("FrierenCloud slash commands", () => {
  it("registers the required public and admin command surface", () => {
    expect(commandBuilders.map(command => command.name)).toEqual(["help", "info", "balance", "status", "create", "manage", "token", "webhook", "logs", "give", "coin", "user"]);
    expect(commandBuilders.every(command => typeof command.description === "string" && command.description.length > 0)).toBe(true);
  });
});
