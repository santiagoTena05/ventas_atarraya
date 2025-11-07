"use client";

import { CanalVentas } from "@/components/reports/CanalVentas";
import { useSales } from "@/lib/hooks/useSales";

export default function CanalVentasPage() {
  const salesHook = useSales();

  return <CanalVentas salesHook={salesHook} />;
}