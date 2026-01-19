import { createClient } from "redis";

let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    redisClient.on("error", (err) => console.error("Redis Client Error", err));

    await redisClient.connect();
    console.log("Redis connected successfully");
  }

  return redisClient;
}

export async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Cache utility functions
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  expiresIn: number = 3600
): Promise<void> {
  const client = await getRedisClient();
  await client.setEx(key, expiresIn, JSON.stringify(value));
}

export async function cacheDel(key: string): Promise<void> {
  const client = await getRedisClient();
  await client.del(key);
}

export async function cacheFlush(): Promise<void> {
  const client = await getRedisClient();
  await client.flushDb();
}
