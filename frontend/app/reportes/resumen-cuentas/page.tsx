"use client";

import { ResumenCuentas } from "@/components/reports/ResumenCuentas";
import { useSales } from "@/lib/hooks/useSales";

export default function ResumenCuentasPage() {
  const salesHook = useSales();

  return <ResumenCuentas salesHook={salesHook} />;
}