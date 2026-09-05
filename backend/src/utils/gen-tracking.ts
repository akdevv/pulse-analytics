import { randomBytes } from "crypto";

export function generateTrackingId(): string {
  return "pk-" + randomBytes(24).toString("base64url");
}
