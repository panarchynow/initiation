"use client";

import React, { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, ExternalLink, Loader2, Check } from "lucide-react";
import { buildSep7TransactionUri } from "@/lib/stellar/sep7UriBuilder";

export interface TransactionResultProps {
  // Transaction data
  transactionXDR: string;
  
  // Clipboard functionality
  isCopied?: boolean;
  onCopy?: (text: string) => void;
  
  // Telegram integration
  telegramBotUrl?: string | null;
  isTelegramUrlLoading?: boolean;
  onTelegramOpen?: () => void;
  
  // Styling
  className?: string;
  
  // Configuration
  title?: string;
  showTelegramButton?: boolean;
  showCopyButton?: boolean;
  showSep7Button?: boolean;
}

const TransactionResult = forwardRef<HTMLDivElement, TransactionResultProps>(({
  transactionXDR,
  isCopied = false,
  onCopy,
  telegramBotUrl,
  isTelegramUrlLoading = false,
  onTelegramOpen,
  className,
  title = "Generated Transaction",
  showTelegramButton = true,
  showCopyButton = true,
  showSep7Button = true,
}, ref) => {
  if (!transactionXDR) {
    return null;
  }

  const handleCopy = () => {
    if (onCopy) {
      onCopy(transactionXDR);
    }
  };

  const handleTelegramOpen = () => {
    if (telegramBotUrl) {
      window.open(telegramBotUrl, '_blank', 'noopener,noreferrer');
    } else if (onTelegramOpen) {
      onTelegramOpen();
    }
  };

  return (
    <Card ref={ref} className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Check className="h-5 w-5 text-green-600" />
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* XDR Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Transaction XDR:
          </label>
          <div className="relative">
            <textarea
              readOnly
              value={transactionXDR}
              className="w-full min-h-[120px] p-3 bg-muted font-mono text-sm rounded-md border resize-none"
              placeholder="Transaction XDR will appear here..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {showCopyButton && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy XDR</span>
                </>
              )}
            </Button>
          )}

          {showSep7Button && (
            <Button
              type="button"
              variant="outline"
              asChild
              className="flex items-center gap-2"
            >
              <a 
                href={buildSep7TransactionUri(transactionXDR, {
                  msg: "Please sign this transaction",
                  return_url: window.location.href
                })}
                target="_blank"
                rel="noreferrer"
              >
                <span>SEP-0007</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}

          {showTelegramButton && (
            <Button
              type="button"
              variant="default"
              onClick={handleTelegramOpen}
              disabled={isTelegramUrlLoading}
              className="flex items-center gap-2"
            >
              {telegramBotUrl ? (
                <>
                  <span>Open in MMWB</span>
                  <ExternalLink className="h-4 w-4" />
                </>
              ) : (
                <>
                  {isTelegramUrlLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign with MMWB</span>
                      <ExternalLink className="h-4 w-4" />
                    </>
                  )}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong>Next steps:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Copy the XDR above</li>
            <li>Sign it using your Stellar wallet or the MMWB Telegram bot</li>
            <li>Submit the signed transaction to the Stellar network</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
});

TransactionResult.displayName = "TransactionResult";

export { TransactionResult };
export default TransactionResult;