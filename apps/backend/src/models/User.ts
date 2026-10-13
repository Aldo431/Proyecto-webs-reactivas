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
  name: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  favorites: string[];
  history: HistoryVisit[];
  cart: CartLineDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMethods {
  toPublicJSON(): PublicUser;
  toProfileJSON(): UserProfile;
}

export type UserModel = Model<UserFields, object, UserMethods>;

export type UserDocument = HydratedDocument<UserFields, UserMethods>;

const userSchema = new Schema<UserFields, UserModel, UserMethods>(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio."],
      trim: true,
      minlength: [1, "El nombre es obligatorio."],
      maxlength: [80, "El nombre no puede superar los 80 caracteres."],
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
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
  };
};

// Los documentos creados antes de 006 no tienen estos campos: se normalizan
// aquí para responder igual sin script de migración (plan 006, D2).
userSchema.methods.toProfileJSON = function (): UserProfile {
  return {
    id: this._id.toString(),
    name: this.name,
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
