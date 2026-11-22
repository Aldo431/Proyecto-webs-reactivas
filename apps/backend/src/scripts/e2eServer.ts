import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

// Servidor para los tests E2E (spec 016, RF-2): levanta la API con una base
// MongoDB efímera en memoria, de modo que la suite no necesita MongoDB
// instalado y nunca toca la base de desarrollo. Replica set porque los pedidos
// usan transacciones (spec 012/014). Lo arranca Playwright (`webServer`) con
// `npm run start:e2e -w backend`.
if (process.env.NODE_ENV !== "test") {
  console.error("El servidor E2E solo puede ejecutarse con NODE_ENV=test.");
  process.exit(1);
}

const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
process.env.MONGODB_URI = mongo.getUri("tiendadcc-e2e");

// Importación diferida: algunos módulos leen la configuración al cargarse
// (p. ej. services/emailService.ts), así que MONGODB_URI debe existir antes.
const { getEnv } = await import("../config/env.ts");
const { connectToDatabase } = await import("../db/connect.ts");
const { createApp } = await import("../app.ts");

const env = getEnv();
await connectToDatabase(env.mongodbUri);
await Promise.all(
  Object.values(mongoose.models).map((model) => model.syncIndexes()),
);

const server = createApp().listen(env.port, () => {
  console.log(`Servidor E2E escuchando en el puerto ${env.port}`);
});

async function shutdown(): Promise<void> {
  server.close();
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
