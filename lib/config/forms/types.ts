// Shared types for form configurations

export type CorporateFormData = {
  accountId: string;
  name: string;
  about: string;
  website?: string;
  contractIPFSHash?: string;
  telegramPartChatID?: string;
  mtlaPiiStandard?: boolean;
  myParts: Array<{ id: string; accountId: string }>;
  tags: string[];
};

export type ParticipantFormData = {
  accountId: string;
  name: string;
  about: string;
  website?: string;
  contractIPFSHash?: string;
  telegramPartChatID?: string;
  partOf: Array<{ id: string; accountId: string }>;
  tags: string[];
};