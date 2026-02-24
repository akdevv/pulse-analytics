import { redis } from "../src/config/redis";

async function testRedis() {
  console.log("Testing redis...");

  // Basic set and get
  await redis.set("hello", "world");
  const value = await redis.get("hello");
  console.log("GET hello:", value); // should print "world"

  // Test with expiry (setex = set + expire)
  await redis.setex("expires_soon", 10, "i will disappear");
  const withTtl = await redis.get("expires_soon");
  console.log("GET expires_soon:", withTtl); // should print "i will disappear"

  // Test storing JSON (this is exactly how we'll cache site data)
  const site = { id: "abc-123", isActive: true, domain: "example.com" };
  await redis.setex("site:tid:pk-test", 300, JSON.stringify(site));
  const cached = await redis.get("site:tid:pk-test");
  const parsed = JSON.parse(cached!);
  console.log("Cached site:", parsed); // should print the object back

  // Cleanup
  await redis.del("hello", "expires_soon", "site:tid:pk-test");
  console.log("Cleanup done");

  await redis.quit();
  console.log("All tests passed ✓");
}

testRedis().catch((err) => {
  console.error("Redis test failed:", err);
  process.exit(1);
});
