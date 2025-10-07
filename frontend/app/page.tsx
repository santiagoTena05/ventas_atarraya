"use client";

import { useState } from "react";
import { VentaForm } from "@/components/forms/VentaForm";
import { VentasTable } from "@/components/tables/VentasTable";
import { ResumenCuentas } from "@/components/reports/ResumenCuentas";
import { ResumenCuentas2 } from "@/components/reports/ResumenCuentas2";
import { Navigation } from "@/components/layout/Navigation";
import { useSales } from "@/lib/hooks/useSales";

export default function Home() {
  const [currentView, setCurrentView] = useState<'form' | 'table' | 'resumen1' | 'resumen2'>('form');
  const salesHook = useSales();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      <div className="pt-4">
        {currentView === 'form' ? (
          <VentaForm
            salesHook={salesHook}
            onSaleRegistered={() => setCurrentView('table')}
          />
        ) : currentView === 'table' ? (
          <VentasTable salesHook={salesHook} />
        ) : currentView === 'resumen1' ? (
          <ResumenCuentas salesHook={salesHook} />
        ) : (
          <ResumenCuentas2 salesHook={salesHook} />
        )}
      </div>
    </div>
  );
}
