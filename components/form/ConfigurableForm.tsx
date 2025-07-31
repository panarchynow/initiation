"use client";

import React from "react";
import { User, Settings, Tags, Users } from "lucide-react";
import type { FormConfig } from "@/lib/config/formConfig.interface";
import type { BaseFormData } from "@/hooks/useAccountData";
import { useFormBuilder } from "@/hooks/useFormBuilder";

// Import composite components
import {
  BaseForm,
  TransactionResult,
  FieldGroup,
  AccountDataLoader,
} from "@/components/form/composite";

// Import atomic components
import {
  ByteLimitedInput,
  StellarAccountInput,
  DynamicFieldArray,
  TagSelectorField,
  FormFieldWrapper,
} from "@/components/form/fields";

import { Switch } from "@/components/ui/switch";

// Icon mapping for field groups
const iconMap = {
  user: <User className="h-5 w-5" />,
  settings: <Settings className="h-5 w-5" />,
  tags: <Tags className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
} as const;

interface ConfigurableFormProps<T extends BaseFormData> {
  config: FormConfig<T>;
  className?: string;
}

export function ConfigurableForm<T extends BaseFormData>({
  config,
  className,
}: ConfigurableFormProps<T>) {
  const {
    form,
    isSubmitting,
    submitError,
    transactionXDR,
    isFetchingAccountData,
    fetchError,
    telegramBotUrl,
    isTelegramUrlLoading,
    isCopied,
    handleSubmit,
    handleReset,
    handleTelegramOpen,
    fetchAccountData,
    copyToClipboard,
    transactionCardRef,
  } = useFormBuilder(config);

  const renderField = (fieldConfig: any) => {
    const { name, type, label, placeholder, description, required, maxBytes, arrayConfig } = fieldConfig;

    switch (type) {
      case 'stellar-account':
        return (
          <StellarAccountInput
            key={name}
            name={name}
            label={label}
            placeholder={placeholder}
            description={description}
            required={required}
          />
        );

      case 'text':
      case 'url':
        return (
          <ByteLimitedInput
            key={name}
            name={name}
            label={label}
            placeholder={placeholder}
            description={description}
            required={required}
            type={type === 'url' ? 'url' : 'text'}
            maxBytes={maxBytes || 64}
          />
        );

      case 'boolean':
        return (
          <FormFieldWrapper
            key={name}
            name={name}
            label={label}
            description={description}
          >
            {(field) => (
              <Switch
                checked={field.value || false}
                onCheckedChange={field.onChange}
              />
            )}
          </FormFieldWrapper>
        );

      case 'dynamic-array':
        return (
          <DynamicFieldArray
            key={name}
            name={name}
            label={label}
            description={description}
            addButtonText={arrayConfig?.addButtonText}
            itemLabel={arrayConfig?.itemLabel}
            maxItems={arrayConfig?.maxItems}
            validateUniqueness={arrayConfig?.validateUniqueness}
            form={form}
          />
        );

      case 'tags':
        return (
          <TagSelectorField
            key={name}
            name={name}
            label={label}
            description={description}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`container mx-auto p-6 space-y-8 ${className || ''}`}>
      <div className="text-center">
        <h1 className="text-3xl font-bold">{config.title}</h1>
        {config.description && (
          <p className="text-muted-foreground mt-2">{config.description}</p>
        )}
      </div>

      <BaseForm
        title={config.title}
        form={form}
        onSubmit={handleSubmit}
        onReset={handleReset}
        isSubmitting={isSubmitting}
        submitError={submitError}
        showResetButton={true}
        className="max-w-4xl mx-auto"
      >
        {/* Account Data Loader */}
        {config.showAccountDataLoader && config.accountDataConfig && (
          <AccountDataLoader
            form={form}
            isLoading={isFetchingAccountData}
            error={fetchError}
            variant="section"
            autoLoadOnAccountIdChange={config.autoLoadAccountData}
            showLoadButton={!config.autoLoadAccountData}
            onLoadData={fetchAccountData}
          />
        )}

        {/* Dynamic Field Groups */}
        {config.fieldGroups.map((group, index) => (
          <FieldGroup
            key={index}
            title={group.title}
            description={group.description}
            variant={group.variant || "section"}
            icon={group.icon ? iconMap[group.icon as keyof typeof iconMap] : undefined}
          >
            <div className="space-y-4">
              {group.fields.map(renderField)}
            </div>
          </FieldGroup>
        ))}
      </BaseForm>

      {/* Transaction Result */}
      {transactionXDR && (
        <TransactionResult
          ref={transactionCardRef}
          transactionXDR={transactionXDR}
          isCopied={isCopied}
          onCopy={copyToClipboard}
          telegramBotUrl={telegramBotUrl}
          isTelegramUrlLoading={isTelegramUrlLoading}
          onTelegramOpen={handleTelegramOpen}
          className="max-w-4xl mx-auto"
        />
      )}
    </div>
  );
}

export default ConfigurableForm;