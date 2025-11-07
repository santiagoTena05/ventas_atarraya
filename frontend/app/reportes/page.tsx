"use client";

import { ReportesVentas } from "@/components/reports/ReportesVentas";
import { useSales } from "@/lib/hooks/useSales";

export default function ReportesPage() {
  const salesHook = useSales();

  return <ReportesVentas salesHook={salesHook} />;
}