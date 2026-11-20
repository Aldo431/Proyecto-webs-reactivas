import { createApp } from "./app.ts";
import { getEnv } from "./config/env.ts";
import { connectToDatabase } from "./db/connect.ts";
import { migrateProductVariants } from "./services/productVariantMigration.ts";

const env = getEnv();
const app = createApp();

try {
  await connectToDatabase(env.mongodbUri);
  console.log("Conexión a MongoDB establecida.");
  const migratedProducts = await migrateProductVariants();
  if (migratedProducts > 0) {
    console.log(
      `Se agregaron variantes base a ${migratedProducts} producto(s) existente(s).`,
    );
  }
} catch {
  console.error(
    "No se pudo conectar o migrar MongoDB. Verifica MONGODB_URI y que el servidor esté disponible.",
  );
  process.exit(1);
}

app.listen(env.port, () => {
  console.log(`Servidor escuchando en el puerto ${env.port}`);
});
