import { randomBytes } from "crypto";
import env from "@/config/env.ts";

export function generateTrackingId(): string {
  return "pk-" + randomBytes(24).toString("base64url");
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
