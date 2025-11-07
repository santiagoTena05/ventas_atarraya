"use client";

import { VentaForm } from "@/components/forms/VentaForm";
import { useSales } from "@/lib/hooks/useSales";

export default function VentasPage() {
  const salesHook = useSales();

  return (
    <VentaForm
      salesHook={salesHook}
      onSaleRegistered={() => {
        // Optionally redirect to table view
        window.location.href = '/ventas/tabla';
      }}
    />
  );
}