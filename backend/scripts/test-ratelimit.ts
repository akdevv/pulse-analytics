import { redis } from "../src/config/redis";
import {
  checkSiteRateLimit,
  checkIpRateLimit,
} from "../src/modules/ingestion/track.ratelimit";

async function test() {
  const siteId = "test-site-123";
  let blocked = 0;
  let allowed = 0;

  console.log("Sending 1010 requests...");

  for (let i = 1; i <= 1010; i++) {
    const allowed_ = await checkSiteRateLimit(siteId, "FREE");
    if (allowed_) {
      allowed++;
    } else {
      blocked++;
    }
  }

  console.log(`Allowed: ${allowed}`); // should be 1000
  console.log(`Blocked: ${blocked}`); // should be 10

  // Cleanup
  const currentMinute = Math.floor(Date.now() / 60000);
  await redis.del(`ratelimit:site:${siteId}:${currentMinute}`);
  console.log("Cleanup done");

  await redis.quit();
}

async function testIpLimit() {
  const ip = "123.139.1.1";
  let allowed = 0;
  let blocked = 0;

  console.log("\nSending 510 requests from same IP...");

  for (let i = 1; i <= 510; i++) {
    const ok = await checkIpRateLimit(ip);
    if (ok) allowed++;
    else blocked++;
  }

  console.log(`Allowed: ${allowed}`); // should be 500
  console.log(`Blocked: ${blocked}`); // should be 10

  // Cleanup
  const currentMinute = Math.floor(Date.now() / 60000);
  await redis.del(`ratelimit:ip:${ip}:${currentMinute}`);
  console.log("Cleanup done");

  await redis.quit();
}

// test().catch(console.error);
testIpLimit().catch(console.error);
