"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ByteLimitedInput,
  StellarAccountInput,
  DynamicFieldArray,
  FormFieldWrapper,
  TagSelectorField,
} from "@/components/form/fields";

// Test schema
const testSchema = z.object({
  name: z.string().min(1, "Name is required"),
  about: z.string().min(1, "About is required"),
  accountId: z.string().min(1, "Account ID is required"),
  myParts: z.array(
    z.object({
      id: z.string(),
      accountId: z.string(),
    })
  ),
  tags: z.array(z.string()),
  enableFeature: z.boolean(),
});

type TestFormData = z.infer<typeof testSchema>;

export default function AtomicFieldsTest() {
  const form = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      name: "",
      about: "",
      accountId: "",
      myParts: [{ id: "1", accountId: "" }],
      tags: [],
      enableFeature: false,
    },
    mode: "onChange",
  });

  const onSubmit = (data: TestFormData) => {
    console.log("Form submitted:", data);
    alert("Check console for form data!");
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Atomic Field Components Test</h1>
        <p className="text-muted-foreground mt-2">
          Демонстрация переиспользуемых атомарных компонентов полей
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ByteLimitedInput Component</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ByteLimitedInput
                name="name"
                label="Name"
                placeholder="Enter your name"
                description="Name with 64 byte limit and counter"
                required
                maxBytes={64}
              />
              
              <ByteLimitedInput
                name="about"
                label="About"
                placeholder="Tell us about yourself"
                description="About description with byte counter"
                required
                maxBytes={64}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>StellarAccountInput Component</CardTitle>
            </CardHeader>
            <CardContent>
              <StellarAccountInput
                name="accountId"
                label="Stellar Account ID"
                description="Enter a valid Stellar public key"
                required
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>DynamicFieldArray Component</CardTitle>
            </CardHeader>
            <CardContent>
              <DynamicFieldArray
                name="myParts"
                label="My Parts"
                description="Manage your participants with validation"
                addButtonText="Add Participant"
                itemLabel="Participant"
                maxItems={5}
                validateUniqueness
                uniquenessErrorMessage="All participant accounts must be unique!"
                form={form}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>TagSelectorField Component</CardTitle>
            </CardHeader>
            <CardContent>
              <TagSelectorField
                name="tags"
                label="Tags"
                description="Select relevant tags for your profile"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>FormFieldWrapper Component</CardTitle>
            </CardHeader>
            <CardContent>
              <FormFieldWrapper
                name="enableFeature"
                label="Enable Special Feature"
                description="This demonstrates FormFieldWrapper with Switch component"
              >
                {(field) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              </FormFieldWrapper>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button type="submit" size="lg">
              Test Form Submission
            </Button>
          </div>
        </form>
      </Form>

      <Card>
        <CardHeader>
          <CardTitle>Form State (Live)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded text-sm overflow-auto">
            {JSON.stringify(form.watch(), null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}