"use client";

import { useState } from "react";
import { VentaForm } from "@/components/forms/VentaForm";
import { VentasTable } from "@/components/tables/VentasTable";
import { Navigation } from "@/components/layout/Navigation";
import { useSales } from "@/lib/hooks/useSales";

export default function Home() {
  const [currentView, setCurrentView] = useState<'form' | 'table'>('form');
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
        ) : (
          <VentasTable salesHook={salesHook} />
        )}
      </div>
    </div>
  );
}
