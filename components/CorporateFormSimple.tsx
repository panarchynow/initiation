"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Minus } from "lucide-react";
import type { FormSchema } from "@/lib/validation";
import { formSchema, calculateByteLength } from "@/lib/validation";
import { generateStellarTransaction } from "@/lib/stellar/index";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

export default function CorporateFormSimple() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionXDR, setTransactionXDR] = useState("");

  // Initialize form
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: "",
      name: "",
      about: "",
      website: "",
      myParts: [{ id: "1", accountId: "" }],
      telegramPartChatID: "",
      tags: [],
      contractIPFSHash: "",
      mtlaPiiStandard: false,
    },
    mode: "onChange",
  });

  // Initialize field array for MyPart fields
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "myParts",
  });

  // Add new MyPart field
  const addMyPart = () => {
    const newId = String(fields.length + 1);
    append({ id: newId, accountId: "" });
  };

  // Form submission handler
  const onSubmit = async (data: FormSchema) => {
    setIsSubmitting(true);
    
    try {
      console.log('Generating transaction with data:', data);
      const xdr = await generateStellarTransaction(data);
      setTransactionXDR(xdr);
      console.log('Transaction generated successfully:', xdr);
    } catch (error) {
      console.error("Error generating transaction:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
        <h2 className="text-lg font-semibold text-green-900 mb-2">Simple Test Version</h2>
        <p className="text-green-700">Simplified version to debug issues</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Account ID Field */}
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account ID *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Stellar account ID"
                          {...field}
                          className="input-glow"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Enter company name"
                            {...field}
                            className="pr-20 input-glow"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            {calculateByteLength(field.value)}/64 bytes
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* MyPart Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>My participants (MyPart relation)</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMyPart}
                      className="text-primary border-primary/20"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Part
                    </Button>
                  </div>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-4">
                      <FormField
                        control={form.control}
                        name={`myParts.${index}.accountId`}
                        render={({ field: accountField }) => (
                          <FormItem className="flex-1">
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Input
                                  placeholder={`Enter account ID for part ${index + 1}`}
                                  {...accountField}
                                  className="input-glow"
                                />
                              </FormControl>
                              {index > 0 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => remove(index)}
                                  className="shrink-0 text-destructive border-destructive/20"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="transition-all duration-200 hover:scale-[1.03]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
                </>
              ) : (
                "Generate Transaction"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Display transaction XDR */}
      {transactionXDR && (
        <Card className="mt-6 border-primary/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Transaction Generated</h3>
              <div className="p-4 bg-secondary/50 rounded-md overflow-auto max-h-56">
                <p className="text-sm font-mono break-all">{transactionXDR}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}