"use client";

// Function to format PartOf ID with leading zeros
export function formatPartOfKey(id: string): string {
  // Pad with leading zeros to make it 3 digits
  const paddedId = id.padStart(3, '0');
  return `PartOf${paddedId}`;
}

// Extract ID from PartOf key (e.g. "PartOf001" -> "1")
export function extractPartOfId(key: string): number | null {
  const match = key.match(/^PartOf(\d+)$/);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

// Find all existing PartOf keys in account data
export function findExistingPartOfKeys(accountData: Record<string, string | Buffer>): string[] {
  const partOfKeys = Object.keys(accountData).filter(key => key.startsWith('PartOf') && /^PartOf\d+$/.test(key));
  
  return partOfKeys;
}

// Find the highest PartOf ID in the account data
export function findHighestPartOfId(accountData: Record<string, string | Buffer>): number {
  const partOfKeys = findExistingPartOfKeys(accountData);
  if (partOfKeys.length === 0) return 0;
  
  const ids = partOfKeys
    .map(key => extractPartOfId(key))
    .filter((id): id is number => id !== null);
  
  if (ids.length === 0) return 0;
  
  const maxId = Math.max(...ids);
  return maxId;
}

// Generate a sequence of available PartOf IDs, starting from the highest existing ID + 1
export function generatePartOfIds(accountData: Record<string, string | Buffer>, count: number): string[] {
  const highestId = findHighestPartOfId(accountData);
  const newIds = Array.from({ length: count }, (_, i) => (highestId + 1 + i).toString());
  
  return newIds;
} 