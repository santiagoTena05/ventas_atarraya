"use client";

import React, { useState, useMemo } from "react";
import { useSales } from "@/lib/hooks/useSales";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, UserIcon, FileTextIcon } from "lucide-react";

interface EstadosCuentaProps {
  salesHook: ReturnType<typeof useSales>;
}

// Datos de clientes organizados por oficina
const clientesData = {
  MV: [
    "abraham", "Jorge Gamboa", "Adriana", "Lamarca", "afrodita", "Agua Sala", "Agua salá",
    "agustin garcia", "Alexis", "Alfonso", "ALFONZO", "ali vega", "alvaro -bacocho",
    "amiga manuel", "anastasio", "Angel Monchistation", "Angel Ruiz", "Angel Santiago",
    "angel tilzapote", "Armando Lonaza", "avelino", "azucena", "berenica-escondida",
    "berenice A1", "Bunker de JP", "carlos", "Carlos sada", "Carniceria Ojeda",
    "Carpintero Patilla", "casa de los angeles", "casona Sforza", "cesar", "Charly",
    "Chef Saúl", "Chofer Larvas", "Cipriano", "Claudia Peña", "claudia zachila", "coro",
    "Cristobal Fabian", "daniel serrano", "DAVID", "david esconido suit", "diana facen",
    "Don Memo", "DONYMAR", "eduardo", "eduardo cruz", "Eduardo Huerta", "Efra Estrada",
    "El Crucero", "El Nene", "elias", "Erick", "fabi aroche", "Fernando Fabian",
    "Fish Shack", "Francis", "GABINO", "gamaliel", "GENOVEVA", "german",
    "gilberto santiago", "Gilberto Torres", "Gudelia", "Guilibaldo bacocho", "Hilario",
    "Hotel Escondido", "Hugo", "hugo baxter", "illian cullen", "isaac", "Israel Garcia",
    "ISSAC", "ivan muciño", "Jairo", "JAVIER", "Jesus juarez", "jhon coast", "Jon",
    "jon coates", "josue", "Juan Alderete", "Karla Atala", "katie wiliams", "kris dondo",
    "leo", "licha panadero", "linet", "lizbeth", "Lonaza", "lucre peña", "luis carreño",
    "Luxo", "manuel", "maria josefa", "mario", "MARTIN FABIAN", "Mauricio", "MAX",
    "maximiliano", "MAXIMILIANO LOPEZ", "maximino", "Mercedes Lopez", "MERMA", "Michel",
    "michel sereso", "Mini L", "Misael hija", "Monchistation", "monse", "Moringa",
    "MUESTRA -francis", "Natalia Seligson", "Nelson", "Noe", "nomad-hotal", "Omar Fabian",
    "Ostreria", "otoniel", "pamela", "patilla", "patrice", "patrice-atrapasueños",
    "Patricio", "Pilar zicatela", "Piyoli", "plinio", "Portezuelo", "Porto Zuelo",
    "Prudencio", "Rafa", "René", "Rene Jesus", "Russek", "Sativa", "Savanna", "Silvia",
    "simion", "sonia", "sonido leo", "Surf and Spot", "susana galvan", "Susana Morro",
    "Syndi", "tomas davó", "toto", "tuli", "Urbano", "Velazquez", "Verde Puerto La Punta",
    "veronica", "visitas a la granja", "wendy c10", "wes smith", "Wokxaca", "Yassine",
    "yolanda park"
  ],
  ALV: [
    "Jorge Gamboa", "Lamarca"
  ]
};

export function EstadosCuenta({ salesHook }: EstadosCuentaProps) {
  const { sales } = salesHook;
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");
  const [oficinaFiltro, setOficinaFiltro] = useState<string>("todas");

  // Obtener lista de clientes filtrada por oficina
  const clientesDisponibles = useMemo(() => {
    if (oficinaFiltro === "todas") {
      // Usar Set para eliminar duplicados al combinar las listas
      const uniqueClients = Array.from(new Set([...clientesData.MV, ...clientesData.ALV]));
      return uniqueClients.sort();
    } else if (oficinaFiltro === "MV") {
      return clientesData.MV.sort();
    } else {
      return clientesData.ALV.sort();
    }
  }, [oficinaFiltro]);

  // Filtrar ventas del cliente seleccionado
  const ventasCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];

    return sales
      .filter(venta => venta.cliente === clienteSeleccionado)
      .sort((a, b) => new Date(b.fechaEntrega).getTime() - new Date(a.fechaEntrega).getTime());
  }, [sales, clienteSeleccionado]);

  // Calcular totales
  const totales = useMemo(() => {
    if (ventasCliente.length === 0) return { totalVentas: 0, totalKgs: 0, promedioPrecio: 0 };

    const totalVentas = ventasCliente.reduce((sum, venta) => sum + venta.totalOrden, 0);
    const totalKgs = ventasCliente.reduce((sum, venta) => sum + venta.enteroKgs, 0);
    const promedioPrecio = totalKgs > 0 ? totalVentas / totalKgs : 0;

    return { totalVentas, totalKgs, promedioPrecio };
  }, [ventasCliente]);

  // Período de fechas
  const periodo = useMemo(() => {
    if (ventasCliente.length === 0) return { inicio: "", fin: "" };

    const fechas = ventasCliente.map(v => new Date(v.fechaEntrega));
    const fechaMin = new Date(Math.min(...fechas.map(f => f.getTime())));
    const fechaMax = new Date(Math.max(...fechas.map(f => f.getTime())));

    return {
      inicio: fechaMin.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }),
      fin: fechaMax.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
    };
  }, [ventasCliente]);

  // Función para obtener color del status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pagado': return 'bg-green-100 text-green-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'cortesía': case 'cortesia': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Encabezado */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Agua Blanca Seafoods</h1>
        <h2 className="text-xl font-semibold text-teal-600 mt-2">Estado de Cuenta</h2>
        <div className="w-24 h-1 bg-teal-600 mx-auto mt-4"></div>
      </div>

      {/* Filtros de selección */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Selección de Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="oficina" className="text-sm font-medium text-gray-700">
                Oficina
              </Label>
              <Select value={oficinaFiltro} onValueChange={setOficinaFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las oficinas</SelectItem>
                  <SelectItem value="MV">Clientes MV</SelectItem>
                  <SelectItem value="ALV">Clientes ALV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="cliente" className="text-sm font-medium text-gray-700">
                Cliente
              </Label>
              <Select value={clienteSeleccionado} onValueChange={setClienteSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {clientesDisponibles.map((cliente) => (
                    <SelectItem key={cliente} value={cliente}>
                      {cliente}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {clienteSeleccionado && (
        <>
          {/* Información del cliente */}
          <Card className="bg-teal-50">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-teal-800">{clienteSeleccionado}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-teal-600">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Fecha Inicial: {periodo.inicio}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Fecha Final: {periodo.fin}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">AB</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de totales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {ventasCliente.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Transacciones</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totales.totalVentas)}
                  </div>
                  <div className="text-sm text-gray-600">Total Ventas</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {totales.totalKgs.toFixed(1)} kg
                  </div>
                  <div className="text-sm text-gray-600">Total Kilos</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de transacciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="h-5 w-5" />
                Detalle de Transacciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ventasCliente.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron transacciones para este cliente
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-teal-600 text-white">
                        <th className="text-left p-3 font-medium">Folio</th>
                        <th className="text-left p-3 font-medium">Fecha Entrega</th>
                        <th className="text-left p-3 font-medium">Producto</th>
                        <th className="text-left p-3 font-medium">Talla Camarón</th>
                        <th className="text-right p-3 font-medium">PAD | Kgs</th>
                        <th className="text-right p-3 font-medium">Entero | Kgs</th>
                        <th className="text-right p-3 font-medium">Precio Venta | Kg</th>
                        <th className="text-right p-3 font-medium">Monto Venta</th>
                        <th className="text-right p-3 font-medium">Total Orden | mxn</th>
                        <th className="text-left p-3 font-medium">Método de Pago</th>
                        <th className="text-left p-3 font-medium">Estatus Pago Cliente</th>
                        <th className="text-left p-3 font-medium">Estatus Factura</th>
                        <th className="text-left p-3 font-medium">No. Factura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasCliente.map((venta, index) => (
                        <tr key={venta.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="p-3 font-medium">#{venta.folio.toString().padStart(4, '0')}</td>
                          <td className="p-3">{formatDate(venta.fechaEntrega)}</td>
                          <td className="p-3">{venta.tipoProducto}</td>
                          <td className="p-3">{venta.tallaCamaron || "-"}</td>
                          <td className="p-3 text-right">
                            {venta.tipoProducto === "PAD" ? venta.enteroKgs.toFixed(1) : "-"}
                          </td>
                          <td className="p-3 text-right">
                            {venta.tipoProducto === "Entero" ? venta.enteroKgs.toFixed(1) : "-"}
                          </td>
                          <td className="p-3 text-right">{formatCurrency(venta.precioVenta)}</td>
                          <td className="p-3 text-right">{formatCurrency(venta.enteroKgs * venta.precioVenta)}</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(venta.totalOrden)}</td>
                          <td className="p-3">{venta.metodoPago}</td>
                          <td className="p-3">
                            <Badge className={`text-xs ${getStatusColor(venta.estatusPagoCliente)}`}>
                              {venta.estatusPagoCliente}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={`text-xs ${getStatusColor(venta.estatusFactura || 'Pendiente')}`}>
                              {venta.estatusFactura || 'Pendiente'}
                            </Badge>
                          </td>
                          <td className="p-3">{venta.folioTransferencia || "-"}</td>
                        </tr>
                      ))}

                      {/* Fila de totales */}
                      <tr className="bg-teal-600 text-white font-bold">
                        <td colSpan={7} className="p-3 text-right">TOTAL:</td>
                        <td className="p-3 text-right">
                          {formatCurrency(ventasCliente.reduce((sum, v) => sum + (v.enteroKgs * v.precioVenta), 0))}
                        </td>
                        <td className="p-3 text-right">
                          {formatCurrency(totales.totalVentas)}
                        </td>
                        <td colSpan={4} className="p-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información adicional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen por Método de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    ventasCliente.reduce((acc, venta) => {
                      acc[venta.metodoPago] = (acc[venta.metodoPago] || 0) + venta.totalOrden;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([metodo, total]) => (
                    <div key={metodo} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">{metodo}</span>
                      <span className="font-semibold">{formatCurrency(total)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen por Estatus de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    ventasCliente.reduce((acc, venta) => {
                      acc[venta.estatusPagoCliente] = (acc[venta.estatusPagoCliente] || 0) + venta.totalOrden;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([estatus, total]) => (
                    <div key={estatus} className="flex justify-between items-center p-2 rounded"
                         style={{backgroundColor: getStatusColor(estatus).includes('green') ? '#f0fdf4' :
                                                 getStatusColor(estatus).includes('yellow') ? '#fffbeb' : '#eff6ff'}}>
                      <Badge className={`text-xs ${getStatusColor(estatus)}`}>
                        {estatus}
                      </Badge>
                      <span className="font-semibold">{formatCurrency(total)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}