"use client";

// Function to format MyPart ID with leading zeros
export function formatMyPartKey(id: string): string {
  // Pad with leading zeros to make it 3 digits
  const paddedId = id.padStart(3, '0');
  return `MyPart${paddedId}`;
}

// Extract ID from MyPart key (e.g. "MyPart001" -> "1")
export function extractMyPartId(key: string): number | null {
  const match = key.match(/^MyPart(\d+)$/);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

// Find all existing MyPart keys in account data
export function findExistingMyPartKeys(accountData: Record<string, string | Buffer>): string[] {
  const myPartKeys = Object.keys(accountData).filter(key => key.startsWith('MyPart') && /^MyPart\d+$/.test(key));
  
  return myPartKeys;
}

// Find the highest MyPart ID in the account data
export function findHighestMyPartId(accountData: Record<string, string | Buffer>): number {
  const myPartKeys = findExistingMyPartKeys(accountData);
  if (myPartKeys.length === 0) return 0;
  
  const ids = myPartKeys
    .map(key => extractMyPartId(key))
    .filter((id): id is number => id !== null);
  
  if (ids.length === 0) return 0;
  
  const maxId = Math.max(...ids);
  return maxId;
}

// Generate a sequence of available MyPart IDs, starting from the highest existing ID + 1
export function generateMyPartIds(accountData: Record<string, string | Buffer>, count: number): string[] {
  const highestId = findHighestMyPartId(accountData);
  const newIds = Array.from({ length: count }, (_, i) => (highestId + 1 + i).toString());
  
  return newIds;
} 