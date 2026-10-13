import {
  MAX_PROD_HISTORY,
  type CartLine,
  type UpdateProfileInput,
} from "@tiendadcc/utils";
import { ConflictError, UnauthorizedError } from "../errors.ts";
import { User, type UserDocument } from "../models/User.ts";
import { verifyPassword } from "./authService.ts";

export async function updateProfileData(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserDocument | null> {
  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(
    input.currentPassword,
    user.passwordHash,
  );
  if (!isValid) {
    throw new UnauthorizedError("La contraseña actual es incorrecta.");
  }

  const email = input.email.trim().toLowerCase();
  const existing = await User.findOne({ email, _id: { $ne: user._id } });
  if (existing) {
    throw new ConflictError();
  }

  user.name = input.name.trim();
  user.email = email;
  await user.save();
  return user;
}

// `$addToSet` garantiza unicidad atómica por productId, incluso ante altas
// concurrentes (plan 006, D2 de favoritos reescrito).
export async function addFavorite(
  userId: string,
  productId: string,
): Promise<UserDocument | null> {
  return User.findByIdAndUpdate(
    userId,
    { $addToSet: { favorites: productId } },
    { new: true },
  );
}

export async function removeFavorite(
  userId: string,
  productId: string,
): Promise<UserDocument | null> {
  return User.findByIdAndUpdate(
    userId,
    { $pull: { favorites: productId } },
    { new: true },
  );
}

export async function recordVisit(
  userId: string,
  productId: string,
): Promise<UserDocument | null> {
  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  const rest = user.history.filter((visit) => visit.productId !== productId);
  user.history = [
    { productId, viewedAt: new Date() },
    ...rest,
  ].slice(0, MAX_PROD_HISTORY);
  await user.save();
  return user;
}

export async function replaceCart(
  userId: string,
  lines: CartLine[],
): Promise<UserDocument | null> {
  return User.findByIdAndUpdate(
    userId,
    {
      cart: lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      })),
    },
    { new: true },
  );
}
