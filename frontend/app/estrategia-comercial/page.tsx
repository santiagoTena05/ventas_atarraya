"use client";

import React from 'react';
import { EstrategiaComercial } from '@/components/estrategia-comercial/EstrategiaComercial';

export default function EstrategiaComercialPage() {
  return (
    <div className="w-full min-h-screen">
      <div className="px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Estrategia Comercial - Simulación de Cosechas
          </h1>
          <p className="text-gray-600">
            Simular cosechas futuras y generar pedidos conectados con las proyecciones del planner
          </p>
        </div>

        <EstrategiaComercial />
      </div>
    </div>
  );
}