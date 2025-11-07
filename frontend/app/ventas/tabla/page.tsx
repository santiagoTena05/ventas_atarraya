"use client";

import { VentasTable } from "@/components/tables/VentasTable";
import { useSales } from "@/lib/hooks/useSales";

export default function VentasTablaPage() {
  const salesHook = useSales();

  return <VentasTable salesHook={salesHook} />;
}