// Shared types for form configurations

export type CorporateFormData = {
  accountId: string;
  network?: 'mainnet' | 'testnet';
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
  network?: 'mainnet' | 'testnet';
  name: string;
  about: string;
  website?: string;
  telegramUserID?: string;
  timeTokenCode?: string;
  timeTokenIssuer?: string;
  timeTokenDesc?: string;
  timeTokenOfferIPFS?: string;
  partOf: Array<{ id: string; accountId: string }>;
  tags: string[];
};