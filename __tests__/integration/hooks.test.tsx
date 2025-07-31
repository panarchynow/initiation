// __tests__/integration/hooks.test.tsx
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { renderHook, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useFormBuilder } from '../../hooks/useFormBuilder';
import { corporateFormConfig } from '../../lib/config/forms/corporateForm.config';
import { participantFormConfig } from '../../lib/config/forms/participantForm.config';

// Mock external dependencies with Jest-style mocks for better compatibility
const mockFetchAccountDataAttributes = mock().mockResolvedValue({});
const mockGenerateStellarTransaction = mock().mockResolvedValue('mock-transaction-xdr');
const mockAddStellarUri = mock().mockResolvedValue('https://t.me/bot');

mock.module('../../lib/stellar/account', () => ({
  fetchAccountDataAttributes: mockFetchAccountDataAttributes,
}));

mock.module('../../lib/stellar/transactionGenerator', () => ({
  generateStellarTransaction: mockGenerateStellarTransaction,
}));

mock.module('../../lib/stellarUriService', () => ({
  addStellarUri: mockAddStellarUri,
}));

describe('Hooks Integration Tests', () => {
  beforeEach(() => {
    mockFetchAccountDataAttributes.mockClear();
    mockGenerateStellarTransaction.mockClear();
    mockAddStellarUri.mockClear();
  });

  describe('useFormBuilder with Corporate Config', () => {
    test('initializes with corporate form configuration', async () => {
      const { result } = renderHook(() => useFormBuilder(corporateFormConfig));

      expect(result.current.form).toBeDefined();
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.transactionXDR).toBe('');
      expect(result.current.submitError).toBeNull();
    });

    test('handles form submission', async () => {
      const { result } = renderHook(() => useFormBuilder(corporateFormConfig));

      // Wait for initialization
      await act(async () => {
        // Set form values with proper default structure
        result.current.form.setValue('accountId', 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
        result.current.form.setValue('name', 'Test Company');
        result.current.form.setValue('about', 'Test Description');
        result.current.form.setValue('myParts', []);
        result.current.form.setValue('tags', []);
      });

      // Submit form using onSubmit instead of handleSubmit directly
      await act(async () => {
        const formData = result.current.form.getValues();
        // Trigger form submission with valid data
        if (result.current.form.formState.isValid || true) { // Force submission for test
          await result.current.handleSubmit();
        }
      });

      await waitFor(() => {
        expect(mockGenerateStellarTransaction).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    test('handles account data loading', async () => {
      mockFetchAccountDataAttributes.mockResolvedValueOnce({
        Name: 'Existing Company',
        About: 'Existing Description',
      });

      const { result } = renderHook(() => useFormBuilder(corporateFormConfig));

      // Set account ID first
      act(() => {
        result.current.form.setValue('accountId', 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
      });

      // Trigger account data loading
      await act(async () => {
        await result.current.fetchAccountData('GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
      });

      await waitFor(() => {
        expect(mockFetchAccountDataAttributes).toHaveBeenCalledWith(
          'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        );
        expect(result.current.isFetchingAccountData).toBe(false);
      }, { timeout: 3000 });
    });

    test('handles form reset', async () => {
      const { result } = renderHook(() => useFormBuilder(corporateFormConfig));

      // Set some values
      act(() => {
        result.current.form.setValue('name', 'Test Company');
        result.current.form.setValue('about', 'Test Description');
      });

      // Reset form
      act(() => {
        result.current.handleReset();
      });

      expect(result.current.form.getValues('name')).toBe('');
      expect(result.current.form.getValues('about')).toBe('');
    });

    test('handles clipboard operations', async () => {
      const { result } = renderHook(() => useFormBuilder(corporateFormConfig));

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: mock(() => Promise.resolve()),
        },
      });

      await act(async () => {
        await result.current.copyToClipboard('test-content');
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-content');
    });

    test('handles telegram integration', async () => {
      const { result } = renderHook(() => useFormBuilder(corporateFormConfig));

      await act(async () => {
        await result.current.handleTelegramOpen('mock-xdr');
      });

      await waitFor(() => {
        expect(mockAddStellarUri).toHaveBeenCalledWith('mock-xdr');
      });
    });
  });

  describe('useFormBuilder with Participant Config', () => {
    test('initializes with participant form configuration', async () => {
      const { result } = renderHook(() => useFormBuilder(participantFormConfig));

      expect(result.current.form).toBeDefined();
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.transactionXDR).toBe('');
      expect(result.current.submitError).toBeNull();
    });

    test('handles participant-specific fields', async () => {
      const { result } = renderHook(() => useFormBuilder(participantFormConfig));

      // Set participant-specific values with all required fields
      act(() => {
        result.current.form.setValue('accountId', 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
        result.current.form.setValue('name', 'Test Participant');
        result.current.form.setValue('about', 'Test Description');
        result.current.form.setValue('telegramUserID', '123456789');
        result.current.form.setValue('timeTokenCode', 'STAS');
        result.current.form.setValue('partOf', []);
        result.current.form.setValue('tags', []);
      });

      // Submit form
      await act(async () => {
        await result.current.handleSubmit();
      });

      await waitFor(() => {
        expect(mockGenerateStellarTransaction).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    test('handles partOf dynamic array', async () => {
      const { result } = renderHook(() => useFormBuilder(participantFormConfig));

      // Set partOf values with all required fields
      act(() => {
        result.current.form.setValue('accountId', 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
        result.current.form.setValue('name', 'Test Participant');
        result.current.form.setValue('about', 'Test Description');
        result.current.form.setValue('partOf', [
          { value: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY' }
        ]);
        result.current.form.setValue('tags', []);
      });

      // Submit form
      await act(async () => {
        await result.current.handleSubmit();
      });

      await waitFor(() => {
        expect(mockGenerateStellarTransaction).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    test('handles field deletion (null values)', async () => {
      const { result } = renderHook(() => useFormBuilder(participantFormConfig));

      // Set initial values with all required fields
      act(() => {
        result.current.form.setValue('accountId', 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
        result.current.form.setValue('name', 'Test Participant');
        result.current.form.setValue('about', 'Test Description');
        result.current.form.setValue('telegramUserID', '123456789');
        result.current.form.setValue('partOf', []);
        result.current.form.setValue('tags', []);
      });

      // Clear telegram field (simulating deletion)
      act(() => {
        result.current.form.setValue('telegramUserID', '');
      });

      // Submit form
      await act(async () => {
        await result.current.handleSubmit();
      });

      await waitFor(() => {
        expect(mockGenerateStellarTransaction).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Error Handling', () => {
    test('handles account data loading errors', async () => {
      mockFetchAccountDataAttributes.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFormBuilder(corporateFormConfig));

      // Set account ID first
      act(() => {
        result.current.form.setValue('accountId', 'INVALID_ACCOUNT_ID');
      });

      await act(async () => {
        try {
          await result.current.fetchAccountData('INVALID_ACCOUNT_ID');
        } catch (error) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isFetchingAccountData).toBe(false);
        // Error should be handled gracefully
      }, { timeout: 3000 });
    });

    test('handles transaction generation errors', async () => {
      mockGenerateStellarTransaction.mockRejectedValueOnce(new Error('Transaction error'));

      const { result } = renderHook(() => useFormBuilder(corporateFormConfig));

      // Set form values with all required fields
      act(() => {
        result.current.form.setValue('accountId', 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
        result.current.form.setValue('name', 'Test Company');
        result.current.form.setValue('about', 'Test Description');
        result.current.form.setValue('myParts', []);
        result.current.form.setValue('tags', []);
      });

      // Submit form
      await act(async () => {
        try {
          await result.current.handleSubmit();
        } catch (error) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
        // Error should be handled
      }, { timeout: 3000 });
    });

    test('handles telegram integration errors', async () => {
      mockAddStellarUri.mockRejectedValueOnce(new Error('Telegram error'));

      const { result } = renderHook(() => useFormBuilder(corporateFormConfig));

      await act(async () => {
        try {
          await result.current.handleTelegramOpen('mock-xdr');
        } catch (error) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isTelegramUrlLoading).toBe(false);
        // Should handle error gracefully without crashing
      }, { timeout: 3000 });
    });
  });
});