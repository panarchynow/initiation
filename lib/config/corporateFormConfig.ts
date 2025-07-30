import type { UseFormReturn } from "react-hook-form";
import type { FormSchema } from "@/lib/validation";
import type { AccountDataConfig, DynamicFieldItem } from "@/hooks/useAccountData";
import { MANAGE_DATA_KEYS } from "@/lib/stellar/transactionBuilder";
import { getTagByKey } from "@/lib/stellar/tags";
import { extractMyPartId } from "@/lib/stellar/mypart";

export const corporateFormAccountDataConfig: AccountDataConfig<FormSchema> = {
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

  // Process MyPart dynamic fields
  processDynamicFields: (dataAttributes) => {
    const myPartKeys = Object.keys(dataAttributes).filter(
      key => key.startsWith('MyPart') && /^MyPart\d+$/.test(key)
    );
    console.log('Found MyPart keys:', myPartKeys);
    
    if (myPartKeys.length > 0) {
      const myParts = myPartKeys.map(key => {
        const id = String(extractMyPartId(key) || "0");
        const value = dataAttributes[key];
        const accountId = Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
        return { id, accountId };
      }).sort((a, b) => Number(a.id) - Number(b.id));
      
      console.log('Mapped MyParts:', myParts);
      return myParts;
    }
    
    return [];
  },

  // Process tags
  processTags: (dataAttributes) => {
    const tagKeys = Object.keys(dataAttributes).filter(key => key.startsWith('Tag'));
    console.log('Found Tag keys:', tagKeys);
    
    const tagIds: string[] = [];
    
    for (const key of tagKeys) {
      const tag = getTagByKey(key);
      if (tag) {
        tagIds.push(tag.id);
      }
    }
    
    console.log('Collected tag IDs:', tagIds);
    return tagIds;
  },

  // Process special fields (MTLA PII Standard)
  processSpecialFields: (dataAttributes, form) => {
    const specialFields: Partial<FormSchema> = {};
    
    // Check for MTLA PII Standard
    if (dataAttributes[MANAGE_DATA_KEYS.MTLA_PII_STANDARD]) {
      console.log('MTLA PII Standard found, enabling toggle');
      form.setValue('mtlaPiiStandard', true, { shouldValidate: true });
      specialFields.mtlaPiiStandard = true;
    }
    
    return specialFields;
  },
};