"use client";

import { Button } from "@/components/ui/button";
import { Plus, Table, BarChart3, FileText, ChevronDown, Fish } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavigationProps {
  currentView: 'form' | 'table' | 'resumen1' | 'resumen2' | 'canal-ventas' | 'reportes-ventas' | 'estados-cuenta' | 'estados-mv-tabla' | 'estados-alv-tabla' | 'estados-alv-resumen' | 'cosecha-form' | 'cosecha-table';
  onViewChange: (view: 'form' | 'table' | 'resumen1' | 'resumen2' | 'canal-ventas' | 'reportes-ventas' | 'estados-cuenta' | 'estados-mv-tabla' | 'estados-alv-tabla' | 'estados-alv-resumen' | 'cosecha-form' | 'cosecha-table') => void;
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={(currentView === 'form' || currentView === 'table') ? 'default' : 'outline'}
                  className={`flex items-center gap-2 ${
                    (currentView === 'form' || currentView === 'table')
                      ? 'bg-gray-900 text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Ventas
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewChange('form')}>
                  Registrar Venta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewChange('table')}>
                  Ver Ventas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={(currentView === 'cosecha-form' || currentView === 'cosecha-table') ? 'default' : 'outline'}
                  className={`flex items-center gap-2 ${
                    (currentView === 'cosecha-form' || currentView === 'cosecha-table')
                      ? 'bg-gray-900 text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Fish className="h-4 w-4" />
                  Cosechas
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewChange('cosecha-form')}>
                  Registrar Cosecha
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewChange('cosecha-table')}>
                  Ver Cosechas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={(currentView === 'resumen1' || currentView === 'resumen2' || currentView === 'canal-ventas' || currentView === 'reportes-ventas') ? 'default' : 'outline'}
                  className={`flex items-center gap-2 ${
                    (currentView === 'resumen1' || currentView === 'resumen2' || currentView === 'canal-ventas' || currentView === 'reportes-ventas')
                      ? 'bg-gray-900 text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Reportes
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewChange('reportes-ventas')}>
                  Reportes de Ventas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewChange('canal-ventas')}>
                  Canal de Ventas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewChange('resumen1')}>
                  Resumen Cuentas I (por responsable)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewChange('resumen2')}>
                  Resumen Cuentas II (por tipo de cliente)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={(currentView === 'estados-cuenta' || currentView === 'estados-mv-tabla' || currentView === 'estados-alv-tabla' || currentView === 'estados-alv-resumen') ? 'default' : 'outline'}
                  className={`flex items-center gap-2 ${
                    (currentView === 'estados-cuenta' || currentView === 'estados-mv-tabla' || currentView === 'estados-alv-tabla' || currentView === 'estados-alv-resumen')
                      ? 'bg-gray-900 text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Estados de Cuenta
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewChange('estados-mv-tabla')}>
                  Estados MV - Formato Tabla
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewChange('estados-cuenta')}>
                  Estados MV - Formato Resumen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewChange('estados-alv-tabla')}>
                  Estados ALV - Formato Tabla
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewChange('estados-alv-resumen')}>
                  Estados ALV - Formato Resumen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}