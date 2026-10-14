import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { connectToDatabase } from "../db/connect.ts";
import { parseSeedEnv } from "../seed/seedEnv.ts";
import { parseSeedProducts, seedProducts } from "../seed/seedProducts.ts";

// Script de línea de comandos: `npm run seed -w backend`. La lógica vive en
// `seed/seedProducts.ts`; aquí solo se lee el entorno, se conecta y se informa.
const envResult = parseSeedEnv(process.env);
if (!envResult.success) {
  // Se valida antes de conectar: sin configuración completa no se escribe nada.
  console.error(envResult.message);
  console.error(
    "Define las variables en apps/backend/.env (ver .env.example) y vuelve a ejecutar el seed.",
  );
  process.exit(1);
}

try {
  const catalog: unknown = JSON.parse(
    readFileSync(new URL("../seed/products.json", import.meta.url), "utf-8"),
  );
  const products = parseSeedProducts(catalog);

  await connectToDatabase(envResult.env.mongodbUri);
  const summary = await seedProducts({
    products,
    sellerPassword: envResult.env.sellerPassword,
  });

  console.log(
    summary.sellerCreated
      ? "Vendedor de prueba creado."
      : "Vendedor de prueba ya existía; se reutilizó.",
  );
  console.log(
    `Productos: ${summary.created} creados, ${summary.updated} actualizados.`,
  );
  console.log(
    `Cuentas con referencias antiguas actualizadas: ${summary.usersRemapped}.`,
  );
} catch (error) {
  console.error(
    "El seed falló:",
    error instanceof Error ? error.message : "error desconocido.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
