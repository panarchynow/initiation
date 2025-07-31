// __tests__/unit/config.test.ts
import { describe, test, expect } from 'bun:test';
import { corporateFormConfig } from '../../lib/config/forms/corporateForm.config';
import { participantFormConfig } from '../../lib/config/forms/participantForm.config';

describe('Form Configuration Tests', () => {
  
  describe('Corporate Form Config', () => {
    test('has required configuration properties', () => {
      expect(corporateFormConfig.title).toBe('Corporate Registration');
      expect(corporateFormConfig.description).toBeDefined();
      expect(corporateFormConfig.schema).toBeDefined();
      expect(corporateFormConfig.defaultValues).toBeDefined();
      expect(corporateFormConfig.fieldGroups).toBeDefined();
      expect(Array.isArray(corporateFormConfig.fieldGroups)).toBe(true);
    });

    test('has correct field groups structure', () => {
      expect(corporateFormConfig.fieldGroups.length).toBeGreaterThan(3);
      
      const fieldGroup = corporateFormConfig.fieldGroups[0];
      expect(fieldGroup.title).toBeDefined();
      expect(fieldGroup.variant).toBeDefined();
      expect(Array.isArray(fieldGroup.fields)).toBe(true);
    });

    test('has account data configuration', () => {
      expect(corporateFormConfig.accountDataConfig).toBeDefined();
      expect(corporateFormConfig.accountDataConfig?.fieldMappings).toBeDefined();
      expect(corporateFormConfig.accountDataConfig?.processDynamicFields).toBeDefined();
      expect(corporateFormConfig.accountDataConfig?.processTags).toBeDefined();
    });

    test('has transaction configuration', () => {
      expect(corporateFormConfig.transactionConfig).toBeDefined();
      expect(corporateFormConfig.transactionConfig?.processChangedData).toBeDefined();
    });

    test('default values structure is valid', () => {
      const defaults = corporateFormConfig.defaultValues;
      expect(defaults.accountId).toBe('');
      expect(defaults.name).toBe('');
      expect(Array.isArray(defaults.myParts)).toBe(true);
      expect(Array.isArray(defaults.tags)).toBe(true);
    });
  });

  describe('Participant Form Config', () => {
    test('has required configuration properties', () => {
      expect(participantFormConfig.title).toBe('Participant Registration');
      expect(participantFormConfig.description).toBeDefined();
      expect(participantFormConfig.schema).toBeDefined();
      expect(participantFormConfig.defaultValues).toBeDefined();
      expect(participantFormConfig.fieldGroups).toBeDefined();
      expect(Array.isArray(participantFormConfig.fieldGroups)).toBe(true);
    });

    test('has participant-specific field groups', () => {
      const groupTitles = participantFormConfig.fieldGroups.map(g => g.title);
      expect(groupTitles).toContain('Participant Configuration');
      expect(groupTitles).toContain('Part Of Organizations');
    });

    test('has participant-specific default values', () => {
      const defaults = participantFormConfig.defaultValues;
      expect(defaults.accountId).toBe('');
      expect(defaults.name).toBe('');
      expect(Array.isArray(defaults.partOf)).toBe(true);
      expect(Array.isArray(defaults.tags)).toBe(true);
    });

    test('transaction config handles participant data', () => {
      expect(participantFormConfig.transactionConfig).toBeDefined();
      expect(participantFormConfig.transactionConfig?.processChangedData).toBeDefined();
      expect(participantFormConfig.transactionConfig?.generateTransaction).toBeDefined();
    });
  });

  describe('Configuration Comparison', () => {
    test('both configs have similar base structure', () => {
      const corporateKeys = Object.keys(corporateFormConfig).sort();
      const participantKeys = Object.keys(participantFormConfig).sort();
      
      // Should have similar top-level structure
      expect(corporateKeys).toEqual(participantKeys);
    });

    test('field groups have consistent structure', () => {
      const corporateFieldGroup = corporateFormConfig.fieldGroups[0];
      const participantFieldGroup = participantFormConfig.fieldGroups[0];
      
      const corporateKeys = Object.keys(corporateFieldGroup).sort();
      const participantKeys = Object.keys(participantFieldGroup).sort();
      
      expect(corporateKeys).toEqual(participantKeys);
    });

    test('configurations are valid and complete', () => {
      // Test that both configurations pass basic validation
      [corporateFormConfig, participantFormConfig].forEach(config => {
        expect(config.title).toBeTruthy();
        expect(config.fieldGroups.length).toBeGreaterThan(0);
        expect(config.defaultValues).toBeTruthy();
        expect(config.schema).toBeTruthy();
      });
    });
  });

  describe('Field Configuration Validation', () => {
    test('all field types are supported', () => {
      const supportedTypes = ['text', 'url', 'checkbox', 'boolean', 'dynamic-array', 'tags'];
      
      [corporateFormConfig, participantFormConfig].forEach(config => {
        config.fieldGroups.forEach(group => {
          group.fields.forEach(field => {
            expect(supportedTypes).toContain(field.type);
          });
        });
      });
    });

    test('required fields are properly marked', () => {
      [corporateFormConfig, participantFormConfig].forEach(config => {
        config.fieldGroups.forEach(group => {
          group.fields.forEach(field => {
            if (field.required !== undefined) {
              expect(typeof field.required).toBe('boolean');
            }
          });
        });
      });
    });

    test('dynamic array fields have proper configuration', () => {
      [corporateFormConfig, participantFormConfig].forEach(config => {
        config.fieldGroups.forEach(group => {
          group.fields.forEach(field => {
            if (field.type === 'dynamic-array') {
              expect(field.arrayConfig).toBeDefined();
              expect(field.arrayConfig?.addButtonText).toBeTruthy();
              expect(field.arrayConfig?.itemLabel).toBeTruthy();
            }
          });
        });
      });
    });
  });
});