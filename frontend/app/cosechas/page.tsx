"use client";

import { CosechaForm } from "@/components/forms/CosechaForm";

export default function CosechasPage() {
  return (
    <CosechaForm
      onCosechaRegistered={() => {
        // Optionally redirect to table view
        window.location.href = '/cosechas/tabla';
      }}
    />
  );
}