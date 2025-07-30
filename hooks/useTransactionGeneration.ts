import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface TransactionGenerationConfig<T> {
  generateTransaction: (data: T) => Promise<string>;
  processChangedData?: (data: T, originalData: Partial<T>) => T;
}

export interface UseTransactionGenerationReturn<T> {
  transactionXDR: string;
  isSubmitting: boolean;
  transactionCardRef: React.RefObject<HTMLDivElement>;
  generateTransaction: (data: T, originalData?: Partial<T>) => Promise<void>;
  resetTransaction: () => void;
}

export function useTransactionGeneration<T>(
  config: TransactionGenerationConfig<T>
): UseTransactionGenerationReturn<T> {
  const [transactionXDR, setTransactionXDR] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const transactionCardRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to transaction card when XDR is generated
  useEffect(() => {
    if (transactionXDR && transactionCardRef.current) {
      transactionCardRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [transactionXDR]);

  const generateTransaction = useCallback(async (data: T, originalData?: Partial<T>) => {
    setIsSubmitting(true);
    
    try {
      let dataToProcess = data;
      
      // Process changed data if original data exists and processor is provided
      if (originalData && Object.keys(originalData).length > 0 && config.processChangedData) {
        dataToProcess = config.processChangedData(data, originalData);
        console.log("Original data:", originalData);
        console.log("Current data:", data);
        console.log("Changed data:", dataToProcess);
      }
      
      // Generate transaction using provided function
      const xdr = await config.generateTransaction(dataToProcess);
      setTransactionXDR(xdr);
      toast.success("Transaction generated successfully!");
    } catch (error) {
      console.error("Error generating transaction:", error);
      
      // Display specific error message if available
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Error generating transaction");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [config]);

  const resetTransaction = useCallback(() => {
    setTransactionXDR("");
    setIsSubmitting(false);
  }, []);

  return {
    transactionXDR,
    isSubmitting,
    transactionCardRef,
    generateTransaction,
    resetTransaction,
  };
}