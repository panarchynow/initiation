// New CorporateForm using configuration-driven architecture
// This replaces the legacy 1000+ line form with a slim 20-line version

import CorporateFormSlim from './CorporateFormSlim';

/**
 * CorporateForm - Refactored using configuration-driven approach
 * 
 * This component now uses:
 * - useFormBuilder hook for orchestration
 * - ConfigurableForm for dynamic rendering
 * - Configuration objects for schema and field definitions
 * - Modular hooks for business logic
 * 
 * Result: ~20 lines instead of 1000+ lines
 */
export default function CorporateForm() {
  return <CorporateFormSlim />;
}