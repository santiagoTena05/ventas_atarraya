"use client";

import { useState } from "react";
import { VentaForm } from "@/components/forms/VentaForm";
import { VentasTable } from "@/components/tables/VentasTable";
import { CosechaForm } from "@/components/forms/CosechaForm";
import { CosechasTable } from "@/components/tables/CosechasTable";
import { ResumenCuentas } from "@/components/reports/ResumenCuentas";
import { ResumenCuentas2 } from "@/components/reports/ResumenCuentas2";
import { CanalVentas } from "@/components/reports/CanalVentas";
import { ReportesVentas } from "@/components/reports/ReportesVentas";
import { EstadosCuenta } from "@/components/reports/EstadosCuenta";
import { EstadosCuentaMVTabla } from "@/components/reports/EstadosCuentaMVTabla";
import { EstadosCuentaALVTabla } from "@/components/reports/EstadosCuentaALVTabla";
import { EstadosCuentaALVResumen } from "@/components/reports/EstadosCuentaALVResumen";
import { Navigation } from "@/components/layout/Navigation";
import { useSales } from "@/lib/hooks/useSales";
import { useCosechas } from "@/lib/hooks/useCosechas";

export default function Home() {
  const [currentView, setCurrentView] = useState<'form' | 'table' | 'resumen1' | 'resumen2' | 'canal-ventas' | 'reportes-ventas' | 'estados-cuenta' | 'estados-mv-tabla' | 'estados-alv-tabla' | 'estados-alv-resumen' | 'cosecha-form' | 'cosecha-table'>('form');
  const salesHook = useSales();
  const cosechasHook = useCosechas();

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
        ) : currentView === 'cosecha-form' ? (
          <CosechaForm onCosechaRegistered={() => setCurrentView('cosecha-table')} />
        ) : currentView === 'cosecha-table' ? (
          <CosechasTable cosechasHook={cosechasHook} />
        ) : currentView === 'resumen1' ? (
          <ResumenCuentas salesHook={salesHook} />
        ) : currentView === 'resumen2' ? (
          <ResumenCuentas2 salesHook={salesHook} />
        ) : currentView === 'canal-ventas' ? (
          <CanalVentas salesHook={salesHook} />
        ) : currentView === 'estados-cuenta' ? (
          <EstadosCuenta salesHook={salesHook} />
        ) : currentView === 'estados-mv-tabla' ? (
          <EstadosCuentaMVTabla salesHook={salesHook} />
        ) : currentView === 'estados-alv-tabla' ? (
          <EstadosCuentaALVTabla salesHook={salesHook} />
        ) : currentView === 'estados-alv-resumen' ? (
          <EstadosCuentaALVResumen salesHook={salesHook} />
        ) : (
          <ReportesVentas salesHook={salesHook} />
        )}
      </div>
    </div>
  );
}
