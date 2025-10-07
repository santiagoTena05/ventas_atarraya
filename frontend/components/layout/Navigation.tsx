"use client";

import { Button } from "@/components/ui/button";
import { Plus, Table } from "lucide-react";

interface NavigationProps {
  currentView: 'form' | 'table';
  onViewChange: (view: 'form' | 'table') => void;
}

export function Navigation({ currentView, onViewChange }: NavigationProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Agua Blanca Seafoods
            </h1>
            <p className="text-sm text-gray-600">
              Sistema de Gestión de Ventas y Cosechas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={currentView === 'form' ? 'default' : 'outline'}
              onClick={() => onViewChange('form')}
              className={`flex items-center gap-2 ${
                currentView === 'form'
                  ? 'bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Plus className="h-4 w-4" />
              Registrar Venta
            </Button>

            <Button
              variant={currentView === 'table' ? 'default' : 'outline'}
              onClick={() => onViewChange('table')}
              className={`flex items-center gap-2 ${
                currentView === 'table'
                  ? 'bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Table className="h-4 w-4" />
              Ver Ventas
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}