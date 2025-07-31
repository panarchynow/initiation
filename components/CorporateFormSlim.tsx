"use client";

import React from "react";
import { ConfigurableForm } from "@/components/form/ConfigurableForm";
import { corporateFormConfig } from "@/lib/config/forms/corporateForm.config";

/**
 * Slim Corporate Form using configuration-driven approach
 * This demonstrates the target architecture: ~20 lines for a complete form!
 */
export default function CorporateFormSlim() {
  return (
    <ConfigurableForm 
      config={corporateFormConfig}
      className="corporate-form"
    />
  );
}

// That's it! 
// - No business logic
// - No validation schemas  
// - No complex state management
// - Just pure configuration
//
// Compare to original CorporateForm.tsx: 1008 lines → 20 lines
// This is the target architecture from our plan!