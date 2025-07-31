import type { UseFormReturn } from "react-hook-form";
import type { AccountDataConfig, DynamicFieldItem } from "@/hooks/useAccountData";
import { MANAGE_DATA_KEYS } from "@/lib/stellar/transactionBuilder";
import { getTagByKey } from "@/lib/stellar/tags";
import { extractPartOfId } from "@/lib/stellar/partof";
import type { ParticipantFormData } from "./types";

export const participantFormAccountDataConfig: AccountDataConfig<ParticipantFormData> = {
  // Field mappings from blockchain keys to form fields
  fieldMappings: {
    [MANAGE_DATA_KEYS.NAME]: "name",
    [MANAGE_DATA_KEYS.ABOUT]: "about", 
    [MANAGE_DATA_KEYS.WEBSITE]: "website",
    [MANAGE_DATA_KEYS.TELEGRAM_USER_ID]: "telegramUserID",
    [MANAGE_DATA_KEYS.TIME_TOKEN_CODE]: "timeTokenCode",
    [MANAGE_DATA_KEYS.TIME_TOKEN_ISSUER]: "timeTokenIssuer",
    [MANAGE_DATA_KEYS.TIME_TOKEN_DESC]: "timeTokenDesc",
    [MANAGE_DATA_KEYS.TIME_TOKEN_OFFER_IPFS]: "timeTokenOfferIPFS",
  },

  // Dynamic field name for PartOf data
  dynamicFieldName: "partOf",

  // Function to process PartOf fields from blockchain data
  processDynamicFields: (dataAttributes: Record<string, string | Buffer>): DynamicFieldItem[] => {
    console.log("Found PartOf keys:", Object.keys(dataAttributes).filter(key => key.startsWith('PartOf')));
    
    const partOfKeys = Object.keys(dataAttributes).filter(key => key.startsWith('PartOf'));
    
    const partOf = partOfKeys.map(key => {
      const rawId = extractPartOfId(key);
      const id = rawId ? rawId.toString() : Date.now().toString(); // Convert to string with fallback
      const accountId = Buffer.from(dataAttributes[key]).toString('utf-8');
      return { id, accountId };
    });

    console.log("Mapped PartOf:", partOf);
    return partOf;
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

  // Function to process special fields (no special fields for participant form yet)
  processSpecialFields: (
    dataAttributes: Record<string, string | Buffer>,
    form: UseFormReturn<ParticipantFormData>
  ): Partial<ParticipantFormData> => {
    const specialFields: Partial<ParticipantFormData> = {};
    // No special processing needed for participant form currently
    return specialFields;
  },
};