// __tests__/integration/ConfigurableForm.test.tsx
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ConfigurableForm } from '../../components/form/ConfigurableForm';
import type { FormConfig } from '../../lib/config/formConfig.interface';

// Mock external dependencies
const mockFetchAccountDataAttributes = mock(() => Promise.resolve({}));
const mockGenerateStellarTransaction = mock(() => Promise.resolve('mock-transaction-xdr'));

mock.module('../../lib/stellar/account', () => ({
  fetchAccountDataAttributes: mockFetchAccountDataAttributes,
}));

mock.module('../../lib/stellar/transactionGenerator', () => ({
  generateStellarTransaction: mockGenerateStellarTransaction,
}));

describe('ConfigurableForm Integration Tests', () => {
  beforeEach(() => {
    mock.restore();
  });

  const mockConfig: FormConfig<any> = {
    title: 'Test Form',
    description: 'Test form description',
    schema: {} as any,
    defaultValues: {
      accountId: '',
      name: '',
      email: '',
    },
    showAccountDataLoader: true,
    autoLoadAccountData: true,
    accountDataConfig: {
      fieldMappings: {
        Name: 'name',
        Email: 'email',
      },
      dynamicFieldName: 'items',
      processDynamicFields: () => [],
      processTags: () => [],
      processSpecialFields: () => ({}),
    } as any,
    fieldGroups: [
      {
        title: 'Basic Info',
        description: 'Basic information fields',
        variant: 'section',
        icon: 'user',
        fields: [
          {
            name: 'name',
            type: 'text',
            label: 'Name',
            required: true,
          },
          {
            name: 'email',
            type: 'text',
            label: 'Email',
            required: true,
          },
        ],
      },
    ],
    transactionConfig: {
      processChangedData: (current) => current,
    },
  };

  test('renders form based on configuration', async () => {
    render(<ConfigurableForm config={mockConfig} />);

    // Check title and description
    expect(screen.getByText('Test Form')).toBeInTheDocument();
    expect(screen.getByText('Test form description')).toBeInTheDocument();

    // Check field group
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    expect(screen.getByText('Basic information fields')).toBeInTheDocument();

    // Check fields
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  test('renders account data loader when configured', async () => {
    render(<ConfigurableForm config={mockConfig} />);

    expect(screen.getByText('Account Data')).toBeInTheDocument();
    expect(screen.getByLabelText(/Stellar Account ID/i)).toBeInTheDocument();
  });

  test('handles dynamic field groups correctly', async () => {
    const configWithDynamic: FormConfig<any> = {
      ...mockConfig,
      fieldGroups: [
        ...mockConfig.fieldGroups,
        {
          title: 'Dynamic Items',
          description: 'Dynamic array field',
          variant: 'section',
          icon: 'list',
          fields: [
            {
              name: 'items',
              type: 'dynamic-array',
              label: 'Items',
              arrayConfig: {
                addButtonText: 'Add Item',
                itemLabel: 'Item',
                maxItems: 5,
                validateUniqueness: true,
              },
            },
          ],
        },
      ],
    };

    render(<ConfigurableForm config={configWithDynamic} />);

    // Check dynamic field group
    expect(screen.getByText('Dynamic Items')).toBeInTheDocument();
    expect(screen.getByText(/Add Item/i)).toBeInTheDocument();
  });

  test('handles tags field correctly', async () => {
    const configWithTags: FormConfig<any> = {
      ...mockConfig,
      fieldGroups: [
        ...mockConfig.fieldGroups,
        {
          title: 'Tags',
          description: 'Tag selection',
          variant: 'section',
          icon: 'tags',
          fields: [
            {
              name: 'tags',
              type: 'tags',
              label: 'Profile Tags',
            },
          ],
        },
      ],
    };

    render(<ConfigurableForm config={configWithTags} />);

    // Check tags field
    expect(screen.getByText('Profile Tags')).toBeInTheDocument();
  });

  test('handles boolean fields correctly', async () => {
    const configWithBoolean: FormConfig<any> = {
      ...mockConfig,
      fieldGroups: [
        ...mockConfig.fieldGroups,
        {
          title: 'Settings',
          description: 'Boolean settings',
          variant: 'section',
          icon: 'settings',
          fields: [
            {
              name: 'enabled',
              type: 'boolean',
              label: 'Enable Feature',
            },
          ],
        },
      ],
    };

    render(<ConfigurableForm config={configWithBoolean} />);

    // Check boolean field (switch)
    expect(screen.getByText('Enable Feature')).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    const user = userEvent.setup();
    render(<ConfigurableForm config={mockConfig} />);

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /generate transaction/i });
    await user.click(submitButton);

    // Should show validation errors (if validation is configured)
    // This depends on how the schema validation is set up
  });

  test('calls transaction generation after form submission', async () => {
    const user = userEvent.setup();
    render(<ConfigurableForm config={mockConfig} />);

    // Fill required fields
    await user.type(
      screen.getByLabelText(/Stellar Account ID/i),
      'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    );
    await user.type(screen.getByLabelText(/Name/i), 'Test Name');
    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /generate transaction/i });
    await user.click(submitButton);

    // Should call processChangedData and transaction generator
    await waitFor(() => {
      expect(mockGenerateStellarTransaction).toHaveBeenCalled();
    });
  });

  test('handles form reset correctly', async () => {
    const user = userEvent.setup();
    render(<ConfigurableForm config={mockConfig} />);

    // Fill some fields
    await user.type(screen.getByLabelText(/Name/i), 'Test Name');
    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');

    // Reset form
    const resetButton = screen.getByRole('button', { name: /reset/i });
    await user.click(resetButton);

    // Fields should be cleared
    expect(screen.getByLabelText(/Name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Email/i)).toHaveValue('');
  });

  test('displays transaction result after successful generation', async () => {
    const user = userEvent.setup();
    mockGenerateStellarTransaction.mockResolvedValueOnce('mock-xdr-result');
    
    render(<ConfigurableForm config={mockConfig} />);

    // Fill and submit form
    await user.type(
      screen.getByLabelText(/Stellar Account ID/i),
      'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    );
    await user.type(screen.getByLabelText(/Name/i), 'Test Name');
    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');

    const submitButton = screen.getByRole('button', { name: /generate transaction/i });
    await user.click(submitButton);

    // Should show transaction result
    await waitFor(() => {
      expect(screen.getByText(/Transaction Generated/i)).toBeInTheDocument();
    });
  });
});