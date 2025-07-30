import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface UseClipboardReturn {
  isCopied: boolean;
  copyToClipboard: (text: string, successMessage?: string) => Promise<void>;
  resetCopiedState: () => void;
}

export function useClipboard(autoResetDelay: number = 2000): UseClipboardReturn {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(async (text: string, successMessage = "Copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success(successMessage);
      
      // Reset copied state after delay
      setTimeout(() => {
        setIsCopied(false);
      }, autoResetDelay);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  }, [autoResetDelay]);

  const resetCopiedState = useCallback(() => {
    setIsCopied(false);
  }, []);

  return {
    isCopied,
    copyToClipboard,
    resetCopiedState,
  };
}