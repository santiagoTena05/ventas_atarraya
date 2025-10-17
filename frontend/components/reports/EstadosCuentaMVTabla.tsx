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

interface EstadosCuentaMVTablaProps {
  salesHook: ReturnType<typeof useSales>;
}

// Clientes MV
const clientesMV = [
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
].sort();

export function EstadosCuentaMVTabla({ salesHook }: EstadosCuentaMVTablaProps) {
  const { sales } = salesHook;
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");

  // Filtrar ventas del cliente seleccionado
  const ventasCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];

    return sales
      .filter(venta => venta.cliente === clienteSeleccionado)
      .sort((a, b) => new Date(b.fechaEntrega).getTime() - new Date(a.fechaEntrega).getTime());
  }, [sales, clienteSeleccionado]);

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
      case 'enviado': return 'bg-green-100 text-green-800';
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
      <div className="text-center border-b border-blue-300 pb-4">
        <h1 className="text-2xl font-bold text-blue-600">Estados de Cuenta | clientes MV</h1>
        <div className="flex justify-end">
          <span className="text-sm font-medium text-blue-600">📄 INDICE</span>
        </div>
      </div>

      {/* Selector de cliente */}
      <Card>
        <CardContent className="p-4">
          <div className="max-w-md">
            <Label htmlFor="cliente" className="text-sm font-medium text-gray-700">
              Seleccionar Cliente MV
            </Label>
            <Select value={clienteSeleccionado} onValueChange={setClienteSeleccionado}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {clientesMV.map((cliente) => (
                  <SelectItem key={cliente} value={cliente}>
                    {cliente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {clienteSeleccionado && (
        <>
          {/* Header del cliente */}
          <div className="bg-white border-b border-gray-200 pb-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-blue-600">Agua Blanca Seafoods</h2>
                <h3 className="text-lg font-semibold text-gray-900">Estado de Cuenta</h3>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  <div>Fecha Inicial: {periodo.inicio}</div>
                  <div>Fecha Final: {periodo.fin}</div>
                </div>
                <div className="mt-2">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">AGUA<br/>BLANCA</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-600 text-white">
              <h4 className="font-bold text-lg">{clienteSeleccionado}</h4>
            </div>
          </div>

          {/* Tabla estilo Excel */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {ventasCliente.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No se encontraron transacciones para este cliente
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="border border-white text-left p-2 font-bold min-w-[80px]">Folio</th>
                      <th className="border border-white text-left p-2 font-bold min-w-[100px]">Fecha Entrega</th>
                      <th className="border border-white text-left p-2 font-bold min-w-[80px]">Producto</th>
                      <th className="border border-white text-left p-2 font-bold min-w-[100px]">Talla Camarón</th>
                      <th className="border border-white text-right p-2 font-bold min-w-[80px]">PAD | Kgs</th>
                      <th className="border border-white text-right p-2 font-bold min-w-[80px]">Entero | Kgs</th>
                      <th className="border border-white text-right p-2 font-bold min-w-[100px]">Precio Venta | Kg</th>
                      <th className="border border-white text-right p-2 font-bold min-w-[100px]">Monto Venta</th>
                      <th className="border border-white text-right p-2 font-bold min-w-[100px]">Total Orden | mxn</th>
                      <th className="border border-white text-left p-2 font-bold min-w-[120px]">Método de Pago</th>
                      <th className="border border-white text-left p-2 font-bold min-w-[120px]">Estatus Pago Cliente</th>
                      <th className="border border-white text-left p-2 font-bold min-w-[100px]">Estatus Factura</th>
                      <th className="border border-white text-left p-2 font-bold min-w-[100px]">No. Factura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasCliente.map((venta, index) => (
                      <tr key={venta.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="border border-gray-300 p-2 font-semibold">
                          {venta.folio}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {formatDate(venta.fechaEntrega)}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {venta.tipoProducto}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {venta.tallaCamaron || "-"}
                        </td>
                        <td className="border border-gray-300 p-2 text-right">
                          {venta.tipoProducto === "PAD" ? venta.enteroKgs.toFixed(1) : "-"}
                        </td>
                        <td className="border border-gray-300 p-2 text-right">
                          {venta.tipoProducto === "Entero" ? venta.enteroKgs.toFixed(1) : "-"}
                        </td>
                        <td className="border border-gray-300 p-2 text-right">
                          {formatCurrency(venta.precioVenta)}
                        </td>
                        <td className="border border-gray-300 p-2 text-right">
                          {formatCurrency(venta.enteroKgs * venta.precioVenta)}
                        </td>
                        <td className="border border-gray-300 p-2 text-right font-semibold">
                          {formatCurrency(venta.totalOrden)}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {venta.metodoPago}
                        </td>
                        <td className="border border-gray-300 p-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(venta.estatusPagoCliente)}`}>
                            {venta.estatusPagoCliente}
                          </span>
                        </td>
                        <td className="border border-gray-300 p-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(venta.estatusFactura || 'Pendiente')}`}>
                            {venta.estatusFactura || 'Pendiente'}
                          </span>
                        </td>
                        <td className="border border-gray-300 p-2">
                          {venta.folioTransferencia || "-"}
                        </td>
                      </tr>
                    ))}

                    {/* Fila de totales */}
                    <tr className="bg-blue-600 text-white font-bold">
                      <td colSpan={7} className="border border-white p-2 text-right font-bold">
                        TOTAL:
                      </td>
                      <td className="border border-white p-2 text-right">
                        {formatCurrency(ventasCliente.reduce((sum, v) => sum + (v.enteroKgs * v.precioVenta), 0))}
                      </td>
                      <td className="border border-white p-2 text-right">
                        {formatCurrency(ventasCliente.reduce((sum, v) => sum + v.totalOrden, 0))}
                      </td>
                      <td colSpan={4} className="border border-white p-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}