import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

export async function startTestDatabase(): Promise<MongoMemoryServer> {
  const server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri());
  return server;
}

export async function stopTestDatabase(
  server: MongoMemoryServer,
): Promise<void> {
  await mongoose.disconnect();
  await server.stop();
}
