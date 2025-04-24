import { z } from "zod";
import { StrKey } from "stellar-sdk";
import { TAGS, getTagIds } from "./stellar";

// Calculate UTF-8 byte length of a string
export function calculateByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

// Maximum byte size for Stellar ManageData operations
const MAX_BYTE_SIZE = 64;

// Validate string does not exceed byte length limit
const validateByteLength = (value: string) => {
  const byteLength = calculateByteLength(value);
  return byteLength <= MAX_BYTE_SIZE;
};

// Validate Stellar account ID
const validateStellarAccountId = (value: string) => {
  return StrKey.isValidEd25519PublicKey(value);
};

// Validate IPFS hash format
const validateIPFSHash = (value: string) => {
  return (
    (value.startsWith("Qm") && value.length === 46) || 
    (value.startsWith("b") && value.length >= 48)
  );
};

// Define MyPart schema
const myPartSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must contain only numbers"),
  accountId: z.string().refine(validateStellarAccountId, {
    message: "Invalid Stellar account ID",
  }),
});

// Define zod schema for form validation
export const formSchema = z.object({
  accountId: z.string()
    .refine((val) => val === "" || validateStellarAccountId(val), {
      message: "Invalid Stellar account ID",
    })
    .optional(),
  name: z
    .string()
    .min(1, "Name is required")
    .refine(validateByteLength, {
      message: `Name must not exceed ${MAX_BYTE_SIZE} bytes in UTF-8 encoding`,
    }),
  about: z
    .string()
    .min(1, "About is required")
    .refine(validateByteLength, {
      message: `About must not exceed ${MAX_BYTE_SIZE} bytes in UTF-8 encoding`,
    }),
  website: z
    .string()
    .url("Must be a valid URL")
    .optional(),
  myParts: z.array(myPartSchema),
  telegramPartChatID: z
    .string()
    .regex(/^\d*$/, "Must contain only numbers")
    .optional(),
  tags: z
    .array(
      z.enum(getTagIds() as [string, ...string[]])
    )
    .optional(),
  contractIPFSHash: z
    .string()
    .refine(validateIPFSHash, {
      message: "Invalid IPFS hash format",
    })
    .optional(),
});

// Export the type of the form schema
export type FormSchema = z.infer<typeof formSchema>;