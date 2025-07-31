"use client";

import { ConfigurableForm } from "@/components/form/ConfigurableForm";
import { participantFormConfig } from "@/lib/config/forms/participantForm.config";

export default function ParticipantFormSlim() {
  return (
    <ConfigurableForm
      config={participantFormConfig}
      className="participant-form"
    />
  );
}