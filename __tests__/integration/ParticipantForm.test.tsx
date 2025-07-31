// __tests__/integration/ParticipantForm.test.tsx
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ParticipantForm from '../../components/ParticipantForm';

// Mock external dependencies
const mockFetchAccountDataAttributes = mock(() => Promise.resolve({}));
const mockGenerateStellarTransaction = mock(() => Promise.resolve('mock-transaction-xdr'));
const mockBuildSep7TransactionUri = mock(() => 'stellar:?xdr=mock-xdr');
const mockAddStellarUri = mock(() => Promise.resolve('https://t.me/bot'));

// Mock stellar modules
mock.module('../../lib/stellar/account', () => ({
  fetchAccountDataAttributes: mockFetchAccountDataAttributes,
}));

mock.module('../../lib/stellar/transactionGenerator', () => ({
  generateStellarTransaction: mockGenerateStellarTransaction,
}));

mock.module('../../lib/stellar/sep7UriBuilder', () => ({
  buildSep7TransactionUri: mockBuildSep7TransactionUri,
}));

mock.module('../../lib/stellarUriService', () => ({
  addStellarUri: mockAddStellarUri,
}));

describe('ParticipantForm Integration Tests', () => {
  beforeEach(() => {
    mock.restore();
  });

  test('renders participant form with all required sections', async () => {
    render(<ParticipantForm />);

    // Check main title
    expect(screen.getByText('Participant Data')).toBeInTheDocument();

    // Check field groups
    expect(screen.getByText('Account Data')).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Participant Configuration')).toBeInTheDocument();
    expect(screen.getByText('Part Of Organizations')).toBeInTheDocument();
    expect(screen.getByText('Tags & Preferences')).toBeInTheDocument();
  });

  test('renders all basic information fields', async () => {
    render(<ParticipantForm />);

    // Check basic form fields
    expect(screen.getByLabelText(/Stellar Account ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/About/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Website/i)).toBeInTheDocument();
  });

  test('renders participant configuration fields', async () => {
    render(<ParticipantForm />);

    // Check participant-specific fields
    expect(screen.getByLabelText(/Telegram User ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Time Token Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Time Token Issuer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Time Token Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Time Token Offer IPFS/i)).toBeInTheDocument();
  });

  test('handles form validation properly', async () => {
    const user = userEvent.setup();
    render(<ParticipantForm />);

    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /generate transaction/i });
    await user.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/Account ID is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    });
  });

  test('fills form fields correctly', async () => {
    const user = userEvent.setup();
    render(<ParticipantForm />);

    // Fill form fields
    const accountIdField = screen.getByLabelText(/Stellar Account ID/i);
    const nameField = screen.getByLabelText(/Name/i);
    const telegramField = screen.getByLabelText(/Telegram User ID/i);

    await user.type(accountIdField, 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    await user.type(nameField, 'Test Participant');
    await user.type(telegramField, '123456789');

    expect(accountIdField).toHaveValue('GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    expect(nameField).toHaveValue('Test Participant');
    expect(telegramField).toHaveValue('123456789');
  });

  test('handles PartOf dynamic array', async () => {
    const user = userEvent.setup();
    render(<ParticipantForm />);

    // Find and click "Add Organization" button  
    const addButton = screen.getByText(/Add Organization/i);
    await user.click(addButton);

    // Should show organization input field
    expect(screen.getByLabelText(/Organization/i)).toBeInTheDocument();

    // Fill organization field
    const organizationField = screen.getByLabelText(/Organization/i);
    await user.type(organizationField, 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY');

    expect(organizationField).toHaveValue('GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY');
  });

  test('handles time token fields', async () => {
    const user = userEvent.setup();
    render(<ParticipantForm />);

    // Fill time token fields
    const codeField = screen.getByLabelText(/Time Token Code/i);
    const issuerField = screen.getByLabelText(/Time Token Issuer/i);
    const descField = screen.getByLabelText(/Time Token Description/i);

    await user.type(codeField, 'STAS');
    await user.type(issuerField, 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    await user.type(descField, 'Test time token');

    expect(codeField).toHaveValue('STAS');
    expect(issuerField).toHaveValue('GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    expect(descField).toHaveValue('Test time token');
  });

  test('handles field deletion correctly', async () => {
    const user = userEvent.setup();
    render(<ParticipantForm />);

    // Fill and then clear a field
    const telegramField = screen.getByLabelText(/Telegram User ID/i);
    await user.type(telegramField, '123456789');
    expect(telegramField).toHaveValue('123456789');

    await user.clear(telegramField);
    expect(telegramField).toHaveValue('');
  });

  test('generates transaction with only changed fields', async () => {
    const user = userEvent.setup();
    render(<ParticipantForm />);

    // Fill required fields
    await user.type(
      screen.getByLabelText(/Stellar Account ID/i),
      'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    );
    await user.type(screen.getByLabelText(/Name/i), 'Test Participant');
    await user.type(screen.getByLabelText(/About/i), 'Test Description');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /generate transaction/i });
    await user.click(submitButton);

    // Should call transaction generator
    await waitFor(() => {
      expect(mockGenerateStellarTransaction).toHaveBeenCalled();
    });
  });

  test('displays transaction result after generation', async () => {
    const user = userEvent.setup();
    mockGenerateStellarTransaction.mockResolvedValueOnce('mock-xdr-result');
    
    render(<ParticipantForm />);

    // Fill and submit form
    await user.type(
      screen.getByLabelText(/Stellar Account ID/i),
      'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    );
    await user.type(screen.getByLabelText(/Name/i), 'Test Participant');
    await user.type(screen.getByLabelText(/About/i), 'Test Description');

    const submitButton = screen.getByRole('button', { name: /generate transaction/i });
    await user.click(submitButton);

    // Should show transaction result
    await waitFor(() => {
      expect(screen.getByText(/Transaction Generated/i)).toBeInTheDocument();
      expect(screen.getByText(/mock-xdr-result/)).toBeInTheDocument();
    });
  });

  test('handles account data loading', async () => {
    const user = userEvent.setup();
    mockFetchAccountDataAttributes.mockResolvedValueOnce({
      Name: 'Existing Name',
      About: 'Existing Description',
      TelegramUserID: '987654321'
    });

    render(<ParticipantForm />);

    // Fill account ID
    await user.type(
      screen.getByLabelText(/Stellar Account ID/i),
      'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    );

    // Should auto-load data and populate fields
    await waitFor(() => {
      expect(mockFetchAccountDataAttributes).toHaveBeenCalledWith(
        'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
      );
    });
  });
});