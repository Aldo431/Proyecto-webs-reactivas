import {
  Schema,
  model,
  type HydratedDocument,
  type Model,
} from "mongoose";
import type { PublicUser, UserProfile } from "@tiendadcc/utils";

export interface HistoryVisit {
  productId: string;
  viewedAt: Date;
}

export interface CartLineDocument {
  productId: string;
  quantity: number;
}

export interface UserFields {
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  sessionVersion: number;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  favorites: string[];
  history: HistoryVisit[];
  cart: CartLineDocument[];
  createdAt: Date;
  updatedAt: Date;
  /** Legado previo a 007: solo se lee para adoptar `username`/`displayName`. */
  name?: string;
}

export interface UserMethods {
  toPublicJSON(): PublicUser;
  toProfileJSON(): UserProfile;
}

export type UserModel = Model<UserFields, object, UserMethods>;

export type UserDocument = HydratedDocument<UserFields, UserMethods>;

const userSchema = new Schema<UserFields, UserModel, UserMethods>(
  {
    username: {
      type: String,
      required: [true, "El nombre de usuario es obligatorio."],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [1, "El nombre de usuario es obligatorio."],
      maxlength: [80, "El nombre de usuario no puede superar los 80 caracteres."],
    },
    displayName: {
      type: String,
      required: [true, "El nombre a mostrar es obligatorio."],
      trim: true,
      minlength: [1, "El nombre a mostrar es obligatorio."],
      maxlength: [80, "El nombre a mostrar no puede superar los 80 caracteres."],
    },
    // Legado previo a 007: se conserva para adoptar documentos antiguos.
    name: {
      type: String,
      required: false,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El correo electrónico es obligatorio."],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    sessionVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    resetToken: {
      type: String,
      required: false,
      default: null,
      index: {
        unique: true,
        partialFilterExpression: { resetToken: { $type: "string" } },
      },
    },
    resetTokenExpiry: {
      type: Date,
      required: false,
      default: null,
    },
    favorites: {
      type: [String],
      default: [],
    },
    history: {
      type: [
        {
          productId: { type: String, required: true },
          viewedAt: { type: Date, required: true },
        },
      ],
      default: [],
    },
    cart: {
      type: [
        {
          productId: { type: String, required: true },
          quantity: { type: Number, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

userSchema.methods.toPublicJSON = function (): PublicUser {
  const username = this.username ?? this.name ?? "";
  return {
    id: this._id.toString(),
    username,
    displayName: this.displayName ?? this.name ?? username,
    email: this.email,
  };
};

// Los documentos creados antes de 006 no tienen estos campos: se normalizan
// aquí para responder igual sin script de migración (plan 006, D2).
userSchema.methods.toProfileJSON = function (): UserProfile {
  const username = this.username ?? this.name ?? "";
  return {
    id: this._id.toString(),
    username,
    displayName: this.displayName ?? this.name ?? username,
    email: this.email,
    emailVerified: this.emailVerified ?? false,
    favorites: this.favorites ?? [],
    history: (this.history ?? []).map((visit: HistoryVisit) => ({
      productId: visit.productId,
      viewedAt: visit.viewedAt.toISOString(),
    })),
    cart: (this.cart ?? []).map((line: CartLineDocument) => ({
      productId: line.productId,
      quantity: line.quantity,
    })),
  };
};

export const User = model<UserFields, UserModel>("User", userSchema);
