import { useState, useCallback } from "react";
import { toast } from "sonner";
import { addStellarUri } from "@/lib/stellarUriService";
import { buildSep7TransactionUri } from "@/lib/stellar/sep7UriBuilder";

export interface UseTelegramIntegrationReturn {
  telegramBotUrl: string | null;
  isTelegramUrlLoading: boolean;
  getTelegramUrl: (transactionXDR: string, options?: {
    msg?: string;
    return_url?: string;
  }) => Promise<void>;
  openTelegramUrl: () => void;
  resetTelegramState: () => void;
}

export function useTelegramIntegration(): UseTelegramIntegrationReturn {
  const [telegramBotUrl, setTelegramBotUrl] = useState<string | null>(null);
  const [isTelegramUrlLoading, setIsTelegramUrlLoading] = useState(false);

  const getTelegramUrl = useCallback(async (
    transactionXDR: string, 
    options?: {
      msg?: string;
      return_url?: string;
    }
  ) => {
    const defaultOptions = {
      msg: "Please sign this transaction",
      return_url: typeof window !== 'undefined' ? window.location.href : ''
    };
    const finalOptions = { ...defaultOptions, ...options };
    if (telegramBotUrl) {
      // If URL already exists, just open it
      window.open(telegramBotUrl, '_blank');
      return;
    }

    setIsTelegramUrlLoading(true);
    try {
      // Get SEP-0007 URI for transaction
      const stellarUri = buildSep7TransactionUri(transactionXDR, finalOptions);
      
      // Send URI to server and get Telegram bot URL
      const url = await addStellarUri(stellarUri);
      setTelegramBotUrl(url);
      
      // Open the received URL in new tab
      window.open(url, '_blank');
    } catch (error) {
      console.error("Error getting Telegram URL:", error);
      toast.error("Error getting Telegram bot URL");
    } finally {
      setIsTelegramUrlLoading(false);
    }
  }, [telegramBotUrl]);

  const openTelegramUrl = useCallback(() => {
    if (telegramBotUrl) {
      window.open(telegramBotUrl, '_blank');
    }
  }, [telegramBotUrl]);

  const resetTelegramState = useCallback(() => {
    setTelegramBotUrl(null);
    setIsTelegramUrlLoading(false);
  }, []);

  return {
    telegramBotUrl,
    isTelegramUrlLoading,
    getTelegramUrl,
    openTelegramUrl,
    resetTelegramState,
  };
}