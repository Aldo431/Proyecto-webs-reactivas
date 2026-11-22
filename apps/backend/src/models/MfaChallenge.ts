import { Schema, model, type Types } from "mongoose";
import type { MfaPurpose } from "@tiendadcc/utils";

export interface MfaChallengeFields {
  user: Types.ObjectId;
  purpose: MfaPurpose;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  resendCount: number;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const mfaChallengeSchema = new Schema<MfaChallengeFields>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["login", "enable", "disable"],
      required: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    resendCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedAt: {
      type: Date,
      required: false,
      default: null,
    },
  },
  { timestamps: true },
);

mfaChallengeSchema.index({ user: 1, purpose: 1 });

export const MfaChallenge = model<MfaChallengeFields>(
  "MfaChallenge",
  mfaChallengeSchema,
);
