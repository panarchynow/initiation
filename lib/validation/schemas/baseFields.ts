import { z } from "zod";
import { StrKey } from '@stellar/stellar-sdk';

// Base field schemas that can be reused across forms
export const baseFieldSchemas = {
  // Account ID validation
  stellarAccountId: z
    .string()
    .min(1, "Account ID is required")
    .refine((value) => StrKey.isValidEd25519PublicKey(value), {
      message: "Invalid Stellar account ID",
    }),

  // Optional Stellar account ID
  stellarAccountIdOptional: z
    .string()
    .optional()
    .refine((value) => !value || StrKey.isValidEd25519PublicKey(value), {
      message: "Invalid Stellar account ID",
    }),

  // Text fields with byte limits
  name: z.string().min(1, "Name is required").max(64, "Name too long"),
  about: z.string().min(1, "About is required").max(64, "About too long"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  
  // IPFS hash
  ipfsHash: z.string().optional(),
  
  // Telegram chat ID  
  telegramChatId: z.string().optional(),
  
  // Telegram user ID (for participants)
  telegramUserId: z.string().regex(/^\d*$/, "Must contain only numbers").optional(),
  
  // Time token fields (for participants)
  timeTokenCode: z.string().optional(),
  timeTokenIssuer: z.string().optional(),
  timeTokenDesc: z.string().optional(),
  timeTokenOfferIPFS: z.string().optional(),
  
  // Boolean flags
  agreement: z.boolean().optional(),
  
  // Tag arrays
  tags: z.array(z.string()),
} as const;

// Composite schemas for common field groups
export const fieldGroups = {
  // Basic profile information
  basicProfile: z.object({
    name: baseFieldSchemas.name,
    about: baseFieldSchemas.about,
    website: baseFieldSchemas.website,
  }),

  // Technical configuration
  technicalConfig: z.object({
    contractIPFSHash: baseFieldSchemas.ipfsHash,
    telegramPartChatID: baseFieldSchemas.telegramChatId,
  }),

  // Agreements and flags
  agreements: z.object({
    mtlaPiiStandard: baseFieldSchemas.agreement,
  }),

  // Participant-specific fields
  participantConfig: z.object({
    telegramUserID: baseFieldSchemas.telegramUserId,
    timeTokenCode: baseFieldSchemas.timeTokenCode,
    timeTokenIssuer: baseFieldSchemas.timeTokenIssuer,
    timeTokenDesc: baseFieldSchemas.timeTokenDesc,
    timeTokenOfferIPFS: baseFieldSchemas.timeTokenOfferIPFS,
  }),
} as const;

export type BaseFieldSchemas = typeof baseFieldSchemas;
export type FieldGroups = typeof fieldGroups;