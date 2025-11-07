"use client";

import { ResumenCuentas2 } from "@/components/reports/ResumenCuentas2";
import { useSales } from "@/lib/hooks/useSales";

export default function ResumenCuentas2Page() {
  const salesHook = useSales();

  return <ResumenCuentas2 salesHook={salesHook} />;
}