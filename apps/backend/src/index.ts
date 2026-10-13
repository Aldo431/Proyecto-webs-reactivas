import { createApp } from "./app.ts";
import { getEnv } from "./config/env.ts";
import { connectToDatabase } from "./db/connect.ts";

const env = getEnv();
const app = createApp();

try {
  await connectToDatabase(env.mongodbUri);
  console.log("Conexión a MongoDB establecida.");
} catch {
  console.error(
    "No se pudo conectar a MongoDB. Verifica MONGODB_URI y que el servidor esté disponible.",
  );
  process.exit(1);
}

app.listen(env.port, () => {
  console.log(`Servidor escuchando en el puerto ${env.port}`);
});
