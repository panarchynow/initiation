import { z } from "zod";
import { baseFieldSchemas } from "./baseFields";

// Dynamic field item schema
export const dynamicFieldItem = z.object({
  id: z.string(),
  accountId: baseFieldSchemas.stellarAccountId,
});

// Dynamic field arrays for different purposes
export const dynamicFieldSchemas = {
  // MyPart fields (corporate form)
  myParts: z.array(dynamicFieldItem),
  
  // PartOf fields (participant form)  
  partOf: z.array(dynamicFieldItem),
  
  // Generic participant array
  participants: z.array(dynamicFieldItem),
} as const;

// Validation helpers for dynamic fields
export const dynamicFieldValidators = {
  // Validate uniqueness in array
  validateUniqueness: (items: Array<{ accountId: string }>) => {
    const accountIds = items.map(item => item.accountId);
    const uniqueIds = new Set(accountIds);
    return uniqueIds.size === accountIds.length;
  },

  // Get duplicate account IDs
  getDuplicates: (items: Array<{ accountId: string }>) => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    
    items.forEach(item => {
      if (seen.has(item.accountId)) {
        duplicates.add(item.accountId);
      } else {
        seen.add(item.accountId);
      }
    });
    
    return Array.from(duplicates);
  },
} as const;

export type DynamicFieldItem = z.infer<typeof dynamicFieldItem>;
export type DynamicFieldSchemas = typeof dynamicFieldSchemas;
export type DynamicFieldValidators = typeof dynamicFieldValidators;