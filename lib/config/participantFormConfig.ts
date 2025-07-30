import type { UseFormReturn } from "react-hook-form";
import type { ParticipantFormSchema } from "@/lib/stellar/participantTransaction";
import type { AccountDataConfig } from "@/hooks/useAccountData";
import { MANAGE_DATA_KEYS } from "@/lib/stellar/transactionBuilder";
import { extractPartOfId } from "@/lib/stellar/partof";

// Function to get tag by ID (from ParticipantForm)
const getTagById = (key: string) => {
  const tagMatch = key.match(/^Tag(.+)$/);
  if (!tagMatch) return null;
  
  return {
    id: tagMatch[1].toLowerCase(),
    key: key
  };
};

export const participantFormAccountDataConfig: AccountDataConfig<ParticipantFormSchema> = {
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

  // Process PartOf dynamic fields
  processDynamicFields: (dataAttributes) => {
    const partOfKeys = Object.keys(dataAttributes).filter(
      key => key.startsWith('PartOf') && /^PartOf\d+$/.test(key)
    );
    console.log('Found PartOf keys:', partOfKeys);
    
    if (partOfKeys.length > 0) {
      const partOf = partOfKeys.map(key => {
        const id = String(extractPartOfId(key) || "0");
        const value = dataAttributes[key];
        const accountId = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
        return { id, accountId };
      }).sort((a, b) => Number(a.id) - Number(b.id));
      
      console.log('Mapped PartOf:', partOf);
      return partOf;
    }
    
    return [];
  },

  // Process tags
  processTags: (dataAttributes) => {
    const tagKeys = Object.keys(dataAttributes).filter(key => key.startsWith('Tag'));
    console.log('Found Tag keys:', tagKeys);
    
    const tagIds: string[] = [];
    
    for (const key of tagKeys) {
      const tag = getTagById(key);
      if (tag) {
        tagIds.push(tag.id);
      }
    }
    
    console.log('Collected tag IDs:', tagIds);
    return tagIds;
  },

  // No special fields for participant form
  processSpecialFields: () => ({}),
};