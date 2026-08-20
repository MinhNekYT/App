export function hasOwnerAccess(discordUserId: string, ownerId: string | undefined): boolean {
  const configuredOwnerId = ownerId?.trim();
  return Boolean(configuredOwnerId) && discordUserId === configuredOwnerId;
}

export function hasAdminAccess(discordUserId: string, ownerId: string | undefined, adminIds: readonly string[]): boolean {
  return hasOwnerAccess(discordUserId, ownerId) || adminIds.includes(discordUserId);
}
