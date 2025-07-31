"use client";

import React from "react";
import { type UseFormReturn } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export interface BaseFormProps<T extends Record<string, any>> {
  // Form instance from useForm
  form: UseFormReturn<T>;
  
  // Form configuration
  title: string;
  description?: string;
  submitButtonText?: string;
  
  // Form state
  isSubmitting?: boolean;
  submitError?: string | null;
  
  // Form handlers
  onSubmit: (data: T) => void | Promise<void>;
  onReset?: () => void;
  
  // Form sections
  children: React.ReactNode;
  
  // Optional sections
  header?: React.ReactNode;
  footer?: React.ReactNode;
  
  // Styling
  className?: string;
  cardClassName?: string;
  
  // Additional form configuration
  showResetButton?: boolean;
  disabled?: boolean;
}

export function BaseForm<T extends Record<string, any>>({
  form,
  title,
  description,
  submitButtonText = "Submit",
  isSubmitting = false,
  submitError,
  onSubmit,
  onReset,
  children,
  header,
  footer,
  className,
  cardClassName,
  showResetButton = false,
  disabled = false,
}: BaseFormProps<T>) {
  const handleSubmit = async (data: T) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const handleReset = () => {
    form.reset();
    if (onReset) {
      onReset();
    }
  };

  return (
    <div className={className}>
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {header}
        </CardHeader>
        
        <CardContent>
          {submitError && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {children}
              
              <div className="flex items-center gap-4 pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || disabled}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    submitButtonText
                  )}
                </Button>
                
                {showResetButton && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleReset}
                    disabled={isSubmitting || disabled}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </form>
          </Form>
          
          {footer}
        </CardContent>
      </Card>
    </div>
  );
}

export default BaseForm;