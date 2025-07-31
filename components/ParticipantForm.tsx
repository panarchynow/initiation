// New ParticipantForm using configuration-driven architecture
// This replaces the legacy 1200+ line form with a slim 12-line version

import ParticipantFormSlim from './ParticipantFormSlim';

/**
 * ParticipantForm - Refactored using configuration-driven approach
 * 
 * This component now uses:
 * - useFormBuilder hook for orchestration
 * - ConfigurableForm for dynamic rendering  
 * - Configuration objects for schema and field definitions
 * - Modular hooks for business logic
 * 
 * Result: ~12 lines instead of 1200+ lines
 */
export default function ParticipantForm() {
  return <ParticipantFormSlim />;
}