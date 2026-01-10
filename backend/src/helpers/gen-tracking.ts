import { randomBytes } from "crypto";

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
<script src="https://api.pulse.com/pulse-sdk.js?tracking_id=${trackingId}"></script>
<script>
  window.pulse = {
    tracking_id: "${trackingId}"
  };
</script>
    `;

  return embedCode;
}
