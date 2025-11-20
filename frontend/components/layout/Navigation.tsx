"use client";

import { Button } from "@/components/ui/button";
import { Plus, Table, BarChart3, FileText, ChevronDown, Fish, Settings, ShoppingCart, Droplets, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Agua Blanca Seafood
            </h1>
            <p className="text-sm text-gray-600">
              Sistema de Gestión de Ventas y Cosechas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={(pathname.startsWith('/ventas')) ? 'default' : 'outline'}
                  className={`flex items-center gap-2 ${
                    (pathname.startsWith('/ventas'))
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
                <DropdownMenuItem onClick={() => router.push('/ventas')}>
                  Registrar Venta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/ventas/tabla')}>
                  Ver Ventas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={(pathname.startsWith('/cosechas')) ? 'default' : 'outline'}
                  className={`flex items-center gap-2 ${
                    (pathname.startsWith('/cosechas'))
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
                <DropdownMenuItem onClick={() => router.push('/cosechas')}>
                  Registrar Cosecha
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/cosechas/tabla')}>
                  Ver Cosechas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={pathname === '/pedidos' ? 'default' : 'outline'}
              className={`flex items-center gap-2 ${
                pathname === '/pedidos'
                  ? 'bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => router.push('/pedidos')}
            >
              <ShoppingCart className="h-4 w-4" />
              Pedidos
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={(pathname.startsWith('/inventario-vivo')) ? 'default' : 'outline'}
                  className={`flex items-center gap-2 ${
                    (pathname.startsWith('/inventario-vivo'))
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Droplets className="h-4 w-4" />
                  Inventario Vivo
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push('/inventario-vivo')}>
                  Registrar Muestreos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/inventario-vivo/generaciones')}>
                  Vista por Generaciones
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/inventario-vivo/calculos')}>
                  Vista de Cálculos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={(pathname.startsWith('/reportes')) ? 'default' : 'outline'}
                  className={`flex items-center gap-2 ${
                    (pathname.startsWith('/reportes'))
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
                <DropdownMenuItem onClick={() => router.push('/reportes')}>
                  Reportes de Ventas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/reportes/canal-ventas')}>
                  Canal de Ventas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/reportes/resumen-cuentas')}>
                  Resumen Cuentas I (por responsable)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/reportes/resumen-cuentas-2')}>
                  Resumen Cuentas II (por tipo de cliente)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* TEMPORALMENTE OCULTO - Estados de Cuenta */}
            {false && (
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
            )}

            <Button
              variant={pathname === '/planner' ? 'default' : 'outline'}
              className={`flex items-center gap-2 ${
                pathname === '/planner'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => router.push('/planner')}
            >
              <Calendar className="h-4 w-4" />
              Planner
            </Button>

            <Button
              variant={pathname === '/admin' ? 'default' : 'outline'}
              className={`flex items-center gap-2 ${
                pathname === '/admin'
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => router.push('/admin')}
            >
              <Settings className="h-4 w-4" />
              Admin
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}