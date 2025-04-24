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
    .min(1, "Account ID is required")
    .refine(validateStellarAccountId, {
      message: "Invalid Stellar account ID",
    }),
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
    .optional()
    .refine((val) => !val || val.startsWith('http'), {
      message: "Must be a valid URL",
    })
    .refine((val) => !val || validateByteLength(val), {
      message: `Website URL must not exceed ${MAX_BYTE_SIZE} bytes in UTF-8 encoding`,
    }),
  myParts: z.array(
    z.object({
      id: z.string().regex(/^\d+$/, "ID must contain only numbers"),
      accountId: z.string().refine(
        (val) => val === "" || validateStellarAccountId(val), {
          message: "Invalid Stellar account ID",
        }
      ),
    })
  )
    .refine(
      (parts) => {
        const nonEmptyAccountIds = parts
          .map(part => part.accountId)
          .filter(id => id !== "");
        const uniqueAccountIds = new Set(nonEmptyAccountIds);
        return nonEmptyAccountIds.length === uniqueAccountIds.size;
      },
      {
        message: "All My Parts account IDs must be unique"
      }
    ),
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
    .optional()
    .refine((val) => !val || validateIPFSHash(val), {
      message: "Invalid IPFS hash format",
    }),
}).refine(
  (data) => {
    if (!data.myParts.length) return true;
    return !data.myParts.some(part => 
      part.accountId !== "" && part.accountId === data.accountId
    );
  },
  {
    message: "My Parts account IDs must not match the main Account ID",
    path: ["myParts"],
  }
);

// Export the type of the form schema
export type FormSchema = z.infer<typeof formSchema>;