"use client";

import { FormSchema } from "./validation";
import StellarSdk from "stellar-sdk";

// Generate a Stellar transaction with ManageData operations for form data
export async function generateStellarTransaction(
  formData: FormSchema
): Promise<string> {
  try {
    // Initialize Stellar server (testnet)
    const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");

    // Use provided account ID or create a placeholder account
    const sourcePublicKey = formData.accountId || StellarSdk.Keypair.random().publicKey();

    // Load the account to get the current sequence number
    const account = await server.loadAccount(sourcePublicKey);

    // Setup a transaction builder with the correct sequence
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    });

    // Add a timebound (30 minutes)
    transaction.setTimeout(30 * 60);

    // Required fields
    transaction.addOperation(
      StellarSdk.Operation.manageData({
        name: "Name",
        value: formData.name,
      })
    );

    transaction.addOperation(
      StellarSdk.Operation.manageData({
        name: "About",
        value: formData.about,
      })
    );

    // Optional fields - only add if they have values
    if (formData.website) {
      transaction.addOperation(
        StellarSdk.Operation.manageData({
          name: "Website",
          value: formData.website,
        })
      );
    }

    // Handle multiple MyPart entries
    formData.myParts.forEach((part, index) => {
      transaction.addOperation(
        StellarSdk.Operation.manageData({
          name: `MyPart_${part.id}`,
          value: part.accountId,
        })
      );
    });

    if (formData.telegramPartChatID) {
      transaction.addOperation(
        StellarSdk.Operation.manageData({
          name: "TelegramPartChatID",
          value: formData.telegramPartChatID,
        })
      );
    }

    if (formData.tags && formData.tags.length > 0) {
      transaction.addOperation(
        StellarSdk.Operation.manageData({
          name: "Tags",
          value: JSON.stringify(formData.tags),
        })
      );
    }

    if (formData.contractIPFSHash) {
      transaction.addOperation(
        StellarSdk.Operation.manageData({
          name: "ContractIPFS",
          value: formData.contractIPFSHash,
        })
      );
    }

    // Build the transaction (unsigned)
    const builtTransaction = transaction.build();

    // Return the transaction XDR
    return builtTransaction.toXDR();
  } catch (error) {
    console.error("Error generating Stellar transaction:", error);
    throw new Error(
      "Failed to generate Stellar transaction. Please try again."
    );
  }
}

// Function to verify a transaction XDR
export function verifyTransactionXDR(xdr: string): boolean {
  try {
    // Parse the XDR to verify it's valid
    const transaction = new StellarSdk.Transaction(xdr, StellarSdk.Networks.TESTNET);
    return true;
  } catch (error) {
    return false;
  }
}