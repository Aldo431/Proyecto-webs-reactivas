import mongoose from "mongoose";
import { connectToDatabase } from "../db/connect.ts";
import {
  grantAdminRole,
  parseMakeAdminInput,
} from "../services/adminRoleService.ts";

// Script de línea de comandos: `npm run make-admin -w backend -- <correo>`.
// La lógica vive en `services/adminRoleService.ts`; aquí solo se lee la
// entrada, se conecta y se informa (mismo patrón que `scripts/seed.ts`).
const input = parseMakeAdminInput(process.argv.slice(2), process.env);
if (!input.success) {
  // Se valida antes de conectar: con entrada inválida no se toca la base.
  console.error(input.message);
  process.exit(1);
}

try {
  await connectToDatabase(input.mongodbUri, input.mongodbDbName);
  const result = await grantAdminRole(input.email);
  if (result.status === "granted") {
    console.log(`Listo: ${result.username} ahora es administrador.`);
  } else if (result.status === "already-admin") {
    console.log(`${result.username} ya era administrador.`);
  } else {
    console.error(`No existe una cuenta con el correo ${input.email}.`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(
    "No se pudo asignar el rol:",
    error instanceof Error ? error.message : "error desconocido.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
