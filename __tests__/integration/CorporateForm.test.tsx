// __tests__/integration/CorporateForm.test.tsx
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CorporateForm from '../../components/CorporateForm';

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

describe('CorporateForm Integration Tests', () => {
  beforeEach(() => {
    mock.restore();
  });

  test('renders corporate form with all required sections', async () => {
    render(<CorporateForm />);

    // Check main title
    expect(screen.getByText('Corporate Data')).toBeInTheDocument();

    // Check field groups
    expect(screen.getByText('Account Data')).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Technical Configuration')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Tags & Preferences')).toBeInTheDocument();
  });

  test('renders all basic information fields', async () => {
    render(<CorporateForm />);

    // Check basic form fields
    expect(screen.getByLabelText(/Stellar Account ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Website/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/About/i)).toBeInTheDocument();
  });

  test('renders technical configuration fields', async () => {
    render(<CorporateForm />);

    // Check technical fields
    expect(screen.getByLabelText(/Contract IPFS Hash/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Telegram Chat ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/MTLA PII Standard/i)).toBeInTheDocument();
  });

  test('handles form validation properly', async () => {
    const user = userEvent.setup();
    render(<CorporateForm />);

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
    render(<CorporateForm />);

    // Fill form fields
    const accountIdField = screen.getByLabelText(/Stellar Account ID/i);
    const nameField = screen.getByLabelText(/Company Name/i);
    const websiteField = screen.getByLabelText(/Website/i);

    await user.type(accountIdField, 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    await user.type(nameField, 'Test Company');
    await user.type(websiteField, 'https://test.com');

    expect(accountIdField).toHaveValue('GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    expect(nameField).toHaveValue('Test Company');
    expect(websiteField).toHaveValue('https://test.com');
  });

  test('handles MyParts dynamic array', async () => {
    const user = userEvent.setup();
    render(<CorporateForm />);

    // Find and click "Add Participant" button
    const addButton = screen.getByText(/Add Participant/i);
    await user.click(addButton);

    // Should show participant input field
    expect(screen.getByLabelText(/Participant/i)).toBeInTheDocument();

    // Fill participant field
    const participantField = screen.getByLabelText(/Participant/i);
    await user.type(participantField, 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY');

    expect(participantField).toHaveValue('GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY');
  });

  test('handles tags selection', async () => {
    render(<CorporateForm />);

    // Check tags field exists
    expect(screen.getByText(/Profile Tags/i)).toBeInTheDocument();
  });

  test('generates transaction after form submission', async () => {
    const user = userEvent.setup();
    render(<CorporateForm />);

    // Fill required fields
    await user.type(
      screen.getByLabelText(/Stellar Account ID/i),
      'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    );
    await user.type(screen.getByLabelText(/Company Name/i), 'Test Company');
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
    
    render(<CorporateForm />);

    // Fill and submit form
    await user.type(
      screen.getByLabelText(/Stellar Account ID/i),
      'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    );
    await user.type(screen.getByLabelText(/Company Name/i), 'Test Company');
    await user.type(screen.getByLabelText(/About/i), 'Test Description');

    const submitButton = screen.getByRole('button', { name: /generate transaction/i });
    await user.click(submitButton);

    // Should show transaction result
    await waitFor(() => {
      expect(screen.getByText(/Transaction Generated/i)).toBeInTheDocument();
      expect(screen.getByText(/mock-xdr-result/)).toBeInTheDocument();
    });
  });

  test('provides copy to clipboard functionality', async () => {
    const user = userEvent.setup();
    mockGenerateStellarTransaction.mockResolvedValueOnce('mock-xdr-result');
    
    render(<CorporateForm />);

    // Generate transaction first
    await user.type(
      screen.getByLabelText(/Stellar Account ID/i),
      'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    );
    await user.type(screen.getByLabelText(/Company Name/i), 'Test Company');
    await user.type(screen.getByLabelText(/About/i), 'Test Description');

    await user.click(screen.getByRole('button', { name: /generate transaction/i }));

    // Wait for transaction result and click copy
    await waitFor(() => {
      const copyButton = screen.getByRole('button', { name: /copy/i });
      expect(copyButton).toBeInTheDocument();
    });
  });

  test('provides SEP-0007 integration', async () => {
    const user = userEvent.setup();
    mockGenerateStellarTransaction.mockResolvedValueOnce('mock-xdr-result');
    
    render(<CorporateForm />);

    // Generate transaction first
    await user.type(
      screen.getByLabelText(/Stellar Account ID/i),
      'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    );
    await user.type(screen.getByLabelText(/Company Name/i), 'Test Company');
    await user.type(screen.getByLabelText(/About/i), 'Test Description');

    await user.click(screen.getByRole('button', { name: /generate transaction/i }));

    // Should show SEP-0007 button
    await waitFor(() => {
      expect(screen.getByText(/Open in Wallet/i)).toBeInTheDocument();
    });
  });

  test('provides MMWB Telegram integration', async () => {
    const user = userEvent.setup();
    mockGenerateStellarTransaction.mockResolvedValueOnce('mock-xdr-result');
    
    render(<CorporateForm />);

    // Generate transaction first
    await user.type(
      screen.getByLabelText(/Stellar Account ID/i),
      'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    );
    await user.type(screen.getByLabelText(/Company Name/i), 'Test Company');
    await user.type(screen.getByLabelText(/About/i), 'Test Description');

    await user.click(screen.getByRole('button', { name: /generate transaction/i }));

    // Should show MMWB button
    await waitFor(() => {
      expect(screen.getByText(/Open in MMWB/i)).toBeInTheDocument();
    });
  });
});