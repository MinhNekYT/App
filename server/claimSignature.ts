import { createHmac, timingSafeEqual } from "crypto";
import { ENV } from "./_core/env";

export function createClaimSignature(id: string) {
  return createHmac("sha256", ENV.cookieSecret).update(`frierencloud-claim:${id}`).digest("hex");
}

export function isValidClaimSignature(id: string, signature: string) {
  const expected = createClaimSignature(id);
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
