"use client";

import { CosechasTable } from "@/components/tables/CosechasTable";
import { useCosechas } from "@/lib/hooks/useCosechas";

export default function CosechasTablaPage() {
  const cosechasHook = useCosechas();

  return <CosechasTable cosechasHook={cosechasHook} />;
}