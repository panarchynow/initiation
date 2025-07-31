import type { UseFormReturn } from "react-hook-form";
import type { AccountDataConfig, DynamicFieldItem } from "@/hooks/useAccountData";
import { MANAGE_DATA_KEYS } from "@/lib/stellar/transactionBuilder";
import { getTagByKey } from "@/lib/stellar/tags";
import { extractMyPartId } from "@/lib/stellar/mypart";
import type { CorporateFormData } from "./types";

export const corporateFormAccountDataConfigSlim: AccountDataConfig<CorporateFormData> = {
  // Field mappings from blockchain keys to form fields
  fieldMappings: {
    [MANAGE_DATA_KEYS.NAME]: "name",
    [MANAGE_DATA_KEYS.ABOUT]: "about", 
    [MANAGE_DATA_KEYS.WEBSITE]: "website",
    [MANAGE_DATA_KEYS.CONTRACT_IPFS]: "contractIPFSHash",
    [MANAGE_DATA_KEYS.TELEGRAM_PART_CHAT_ID]: "telegramPartChatID",
  },

  // Dynamic field name for MyPart data
  dynamicFieldName: "myParts",

  // Function to process MyPart fields from blockchain data
  processDynamicFields: (dataAttributes: Record<string, string | Buffer>): DynamicFieldItem[] => {
    console.log("Found MyPart keys:", Object.keys(dataAttributes).filter(key => key.startsWith('MyPart')));
    
    const myPartKeys = Object.keys(dataAttributes).filter(key => key.startsWith('MyPart'));
    
    const myParts = myPartKeys.map(key => {
      const rawId = extractMyPartId(key);
      const id = rawId ? rawId.toString() : Date.now().toString(); // Convert to string with fallback
      const accountId = Buffer.from(dataAttributes[key]).toString('utf-8');
      return { id, accountId };
    });

    console.log("Mapped MyParts:", myParts);
    return myParts;
  },

  // Function to process tags
  processTags: (dataAttributes: Record<string, string | Buffer>): string[] => {
    console.log("Found Tag keys:", Object.keys(dataAttributes).filter(key => key.startsWith('Tag')));
    
    const tagKeys = Object.keys(dataAttributes).filter(key => key.startsWith('Tag'));
    
    const tags = tagKeys.map(key => {
      const tag = getTagByKey(key);
      return tag ? tag.id : null;
    }).filter(Boolean) as string[];

    console.log("Collected tag IDs:", tags);
    return tags;
  },

  // Function to process special fields (like mtlaPiiStandard)
  processSpecialFields: (
    dataAttributes: Record<string, string | Buffer>,
    form: UseFormReturn<CorporateFormData>
  ): Partial<CorporateFormData> => {
    const specialFields: Partial<CorporateFormData> = {};

    // Process MTLA PII Standard
    if (MANAGE_DATA_KEYS.MTLA_PII_STANDARD in dataAttributes) {
      const value = Buffer.from(dataAttributes[MANAGE_DATA_KEYS.MTLA_PII_STANDARD]).toString('utf-8');
      specialFields.mtlaPiiStandard = value === 'true';
    }

    return specialFields;
  },
};