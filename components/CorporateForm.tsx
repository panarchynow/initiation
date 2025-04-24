"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check, AlertCircle, Plus, Minus, Copy, CopyCheck } from "lucide-react";
import type { FormSchema } from "@/lib/validation";
import { formSchema, calculateByteLength } from "@/lib/validation";
import { generateStellarTransaction } from "@/lib/stellar";
import { uploadFile } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import TagSelector from "@/components/form/TagSelector";
import FileUploadField from "@/components/form/FileUploadField";

export default function CorporateForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionXDR, setTransactionXDR] = useState("");
  const [uploadTab, setUploadTab] = useState("file");
  const [isCopied, setIsCopied] = useState(false);

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
      const xdr = await generateStellarTransaction(data);
      setTransactionXDR(xdr);
      toast.success("Transaction generated successfully!");
    } catch (error) {
      console.error("Error submitting form:", error);
      
      // Отображаем конкретное сообщение об ошибке, если доступно
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Error generating transaction");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      const ipfsHash = await uploadFile(file);
      form.setValue("contractIPFSHash", ipfsHash, { shouldValidate: true });
      toast.success("File uploaded successfully");
      return ipfsHash;
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("Error uploading file");
      return null;
    }
  };

  // Функция копирования XDR в буфер обмена
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transactionXDR);
      setIsCopied(true);
      toast.success("Transaction XDR copied to clipboard");
      
      // Сбросить статус копирования через 2 секунды
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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
                      <FormDescription>
                        Your Stellar public account ID
                      </FormDescription>
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
                      <FormDescription>
                        Your company's official name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* About Field */}
                <FormField
                  control={form.control}
                  name="about"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>About *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Brief description of your company"
                            className="pr-20 input-glow"
                            {...field}
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            {calculateByteLength(field.value)}/64 bytes
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        A short description of your company
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Website Field */}
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="https://example.com"
                            {...field}
                            className="pr-20 input-glow"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                            {calculateByteLength(field.value || "")}/64 bytes
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Your company website URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* MyPart Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>My Parts</FormLabel>
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

                {/* TelegramPartChatID Field */}
                <FormField
                  control={form.control}
                  name="telegramPartChatID"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telegram Part Chat ID (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Telegram chat ID"
                          {...field}
                          className="input-glow"
                        />
                      </FormControl>
                      <FormDescription>
                        Telegram chat ID for communication
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tags Field */}
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (Optional)</FormLabel>
                      <FormControl>
                        <TagSelector
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Select relevant tags for your company
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ContractIPFS Field */}
                <FormItem className="space-y-4">
                  <FormLabel>Contract IPFS (Optional)</FormLabel>
                  <Tabs
                    defaultValue="file"
                    value={uploadTab}
                    onValueChange={setUploadTab}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="file">Upload File</TabsTrigger>
                      <TabsTrigger value="hash">IPFS Hash</TabsTrigger>
                    </TabsList>
                    <TabsContent value="file" className="pt-4">
                      <FileUploadField onUpload={handleFileUpload} />
                      {form.formState.errors.contractIPFSHash && (
                        <p className="text-sm font-medium text-destructive mt-2">
                          {form.formState.errors.contractIPFSHash.message}
                        </p>
                      )}
                    </TabsContent>
                    <TabsContent value="hash" className="pt-4">
                      <FormField
                        control={form.control}
                        name="contractIPFSHash"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Enter IPFS hash"
                                {...field}
                                className="input-glow"
                              />
                            </FormControl>
                            <FormDescription>
                              Enter an existing IPFS hash for your contract
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </FormItem>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-medium">Transaction Generated</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center gap-1"
                >
                  {isCopied ? (
                    <>
                      <CopyCheck className="h-4 w-4" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy XDR</span>
                    </>
                  )}
                </Button>
              </div>
              <div className="p-4 bg-secondary/50 rounded-md overflow-auto max-h-56">
                <p className="text-sm font-mono break-all">{transactionXDR}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                This is your unsigned Stellar transaction XDR. Copy this value to submit it to the Stellar network.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}