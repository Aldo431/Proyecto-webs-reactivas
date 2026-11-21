import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

export async function startTestDatabase(): Promise<MongoMemoryReplSet> {
  const server = await MongoMemoryReplSet.create();
  await mongoose.connect(server.getUri());
  return server;
}

export async function stopTestDatabase(
  server: MongoMemoryReplSet,
): Promise<void> {
  await mongoose.disconnect();
  await server.stop();
}
