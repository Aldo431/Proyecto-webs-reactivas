import { z } from "zod";
import { emailField } from "@tiendadcc/utils";
import { User } from "../models/User.ts";

export const MAKE_ADMIN_USAGE =
  "Uso: npm run make-admin -w backend -- <correo>";

export type MakeAdminInputResult =
  | { success: true; email: string; mongodbUri: string; mongodbDbName?: string }
  | { success: false; message: string };

const mongodbUriSchema = z
  .string({ error: "Falta la variable de entorno MONGODB_URI." })
  .trim()
  .min(1, "Falta la variable de entorno MONGODB_URI.");

// Se ejecuta antes de conectar: sin argumento válido o sin MONGODB_URI no se
// toca la base. `argv` son solo los argumentos del usuario (sin node ni ruta).
export function parseMakeAdminInput(
  argv: string[],
  env: Record<string, string | undefined>,
): MakeAdminInputResult {
  const rawEmail = argv[0];
  if (rawEmail === undefined) {
    return { success: false, message: MAKE_ADMIN_USAGE };
  }
  const email = emailField.safeParse(rawEmail);
  if (!email.success) {
    return {
      success: false,
      message: `${MAKE_ADMIN_USAGE}\nEl correo "${rawEmail}" no es válido.`,
    };
  }
  const uri = mongodbUriSchema.safeParse(env.MONGODB_URI);
  if (!uri.success) {
    return {
      success: false,
      message: uri.error.issues.map((issue) => issue.message).join("\n"),
    };
  }
  const databaseName = env.MONGODB_DBNAME?.trim();
  return {
    success: true,
    email: email.data,
    mongodbUri: uri.data,
    ...(databaseName ? { mongodbDbName: databaseName } : {}),
  };
}

export type GrantAdminResult =
  | { status: "granted" | "already-admin"; username: string }
  | { status: "not-found" };

export async function grantAdminRole(email: string): Promise<GrantAdminResult> {
  const normalized = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalized });
  if (!user) {
    return { status: "not-found" };
  }
  const username = user.toPublicJSON().username;
  if (user.role === "admin") {
    return { status: "already-admin", username };
  }
  await User.updateOne({ _id: user._id }, { $set: { role: "admin" } });
  return { status: "granted", username };
}
