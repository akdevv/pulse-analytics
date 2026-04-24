import { randomBytes } from "crypto";
import env from "@/config/env.ts";

export function generateTrackingId(): string {
  const PREFIX = "pk-";
  const RANDOM_LEN = 32 - PREFIX.length;

  const bytes = randomBytes(RANDOM_LEN);
  const hex = bytes.toString("hex");
  const base64 = Buffer.from(hex, "hex").toString("base64");
  const id = base64.replace(/[^a-zA-Z0-9]/g, "").slice(0, RANDOM_LEN);

  return PREFIX + id;
}

export function generateEmbedCode(trackingId: string): string {
  const embedCode = `
<!-- Pulse Analytics -->
<script src="${env.TRACKING_SCRIPT_URL}/pulse-sdk.js?trackingId=${trackingId}"></script>
<script>
  window.pulse = {
    trackingId: "${trackingId}"
  };
</script>
    `;

  return embedCode;
}
