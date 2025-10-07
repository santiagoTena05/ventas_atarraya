"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ventaSchema, type VentaFormData } from "@/lib/schemas";
import { mockData } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSales } from "@/lib/hooks/useSales";

interface VentaFormProps {
  salesHook: ReturnType<typeof useSales>;
  onSaleRegistered?: () => void;
}

export function VentaForm({ salesHook, onSaleRegistered }: VentaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addSale, getNextFolio } = salesHook;

  const form = useForm<VentaFormData>({
    resolver: zodResolver(ventaSchema),
    defaultValues: {
      enteroKgs: 0,
      precioVenta: 0,
      descuentoPorcentaje: 0,
      descuentoMxn: 0,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;

  // Watch values for calculations
  const enteroKgs = watch("enteroKgs") || 0;
  const precioVenta = watch("precioVenta") || 0;
  const descuentoPorcentaje = watch("descuentoPorcentaje") || 0;
  const descuentoMxn = watch("descuentoMxn") || 0;

  // Calculate totals
  const montoVenta = useMemo(() => enteroKgs * precioVenta, [enteroKgs, precioVenta]);
  const descuentoCalculado = useMemo(() => {
    return (montoVenta * descuentoPorcentaje) / 100;
  }, [montoVenta, descuentoPorcentaje]);
  const totalOrden = useMemo(() => {
    return montoVenta - descuentoCalculado - descuentoMxn;
  }, [montoVenta, descuentoCalculado, descuentoMxn]);

  const onSubmit = async (data: VentaFormData) => {
    setIsSubmitting(true);
    try {
      const nextFolio = getNextFolio();

      // Agregar la venta al estado compartido
      const newSale = addSale(data, nextFolio);

      console.log("Nueva venta registrada:", newSale);

      alert(`Venta registrada exitosamente con folio #${nextFolio.toString().padStart(4, '0')}`);

      // Limpiar formulario
      form.reset({
        enteroKgs: 0,
        precioVenta: 0,
        descuentoPorcentaje: 0,
        descuentoMxn: 0,
      });

      // Opcional: cambiar a vista de tabla automáticamente
      if (onSaleRegistered) {
        setTimeout(() => {
          onSaleRegistered();
        }, 1000);
      }
    } catch (error) {
      console.error("Error al registrar venta:", error);
      alert("Error al registrar la venta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    form.reset();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-6xl mx-auto border-gray-200">
        <CardHeader className="bg-white border-b border-gray-100">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Formulario de Ventas
          </CardTitle>
          <p className="text-sm text-gray-600">
            Registro de nueva venta - Agua Blanca Seafoods
          </p>
        </CardHeader>

        <CardContent className="p-8 bg-white">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Datos Administrativos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Datos Administrativos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    # Registro
                  </Label>
                  <div className="h-10 px-3 py-2 border border-gray-300 bg-gray-50 rounded-md text-sm font-semibold">
                    #{getNextFolio().toString().padStart(4, '0')}
                  </div>
                  <p className="text-xs text-gray-500">Auto-generado</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oficina" className="text-sm font-medium text-gray-700">
                    Oficina *
                  </Label>
                  <Select onValueChange={(value) => setValue("oficina", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Seleccionar oficina" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockData.oficinas.map((oficina) => (
                        <SelectItem key={oficina.id} value={oficina.name}>
                          {oficina.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.oficina && (
                    <p className="text-xs text-red-600">{errors.oficina.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsable" className="text-sm font-medium text-gray-700">
                    Responsable *
                  </Label>
                  <Select onValueChange={(value) => setValue("responsable", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Seleccionar responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockData.responsables.map((responsable) => (
                        <SelectItem key={responsable.id} value={responsable.name}>
                          {responsable.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.responsable && (
                    <p className="text-xs text-red-600">{errors.responsable.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regionMercado" className="text-sm font-medium text-gray-700">
                    Región de Mercado *
                  </Label>
                  <Select onValueChange={(value) => setValue("regionMercado", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Seleccionar región" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockData.regionesMercado.map((region) => (
                        <SelectItem key={region.id} value={region.name}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.regionMercado && (
                    <p className="text-xs text-red-600">{errors.regionMercado.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Datos de Cosecha */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Datos de Cosecha
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="notaSalidaGranja" className="text-sm font-medium text-gray-700">
                    Nota Salida Granja
                  </Label>
                  <Input
                    id="notaSalidaGranja"
                    {...register("notaSalidaGranja")}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    placeholder="Nota de salida"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaCosecha" className="text-sm font-medium text-gray-700">
                    Fecha Cosecha *
                  </Label>
                  <Input
                    id="fechaCosecha"
                    type="date"
                    {...register("fechaCosecha")}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                  {errors.fechaCosecha && (
                    <p className="text-xs text-red-600">{errors.fechaCosecha.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaEntrega" className="text-sm font-medium text-gray-700">
                    Fecha Entrega *
                  </Label>
                  <Input
                    id="fechaEntrega"
                    type="date"
                    {...register("fechaEntrega")}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                  {errors.fechaEntrega && (
                    <p className="text-xs text-red-600">{errors.fechaEntrega.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Datos del Cliente */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Datos del Cliente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente" className="text-sm font-medium text-gray-700">
                    Cliente *
                  </Label>
                  <Input
                    id="cliente"
                    {...register("cliente")}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    placeholder="Nombre del cliente"
                  />
                  {errors.cliente && (
                    <p className="text-xs text-red-600">{errors.cliente.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoCliente" className="text-sm font-medium text-gray-700">
                    Tipo de Cliente *
                  </Label>
                  <Select onValueChange={(value) => setValue("tipoCliente", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockData.tiposCliente.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.name}>
                          {tipo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tipoCliente && (
                    <p className="text-xs text-red-600">{errors.tipoCliente.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="noOrdenAtarraya" className="text-sm font-medium text-gray-700">
                    No. Orden Atarraya
                  </Label>
                  <Input
                    id="noOrdenAtarraya"
                    {...register("noOrdenAtarraya")}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    placeholder="Número de orden"
                  />
                </div>
              </div>
            </div>

            {/* Datos del Producto */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Datos del Producto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoProducto" className="text-sm font-medium text-gray-700">
                    Tipo de Producto *
                  </Label>
                  <Select onValueChange={(value) => setValue("tipoProducto", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockData.tiposProducto.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.name}>
                          {tipo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tipoProducto && (
                    <p className="text-xs text-red-600">{errors.tipoProducto.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tallaCamaron" className="text-sm font-medium text-gray-700">
                    Talla Camarón
                  </Label>
                  <Select onValueChange={(value) => setValue("tallaCamaron", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Seleccionar talla" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockData.tallasCamaron.map((talla) => (
                        <SelectItem key={talla.id} value={talla.name}>
                          {talla.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enteroKgs" className="text-sm font-medium text-gray-700">
                    Entero | kgs *
                  </Label>
                  <Input
                    id="enteroKgs"
                    type="number"
                    step="0.001"
                    {...register("enteroKgs", { valueAsNumber: true })}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    placeholder="0.000"
                  />
                  {errors.enteroKgs && (
                    <p className="text-xs text-red-600">{errors.enteroKgs.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precioVenta" className="text-sm font-medium text-gray-700">
                    Precio Venta *
                  </Label>
                  <Input
                    id="precioVenta"
                    type="number"
                    step="0.01"
                    {...register("precioVenta", { valueAsNumber: true })}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    placeholder="0.00"
                  />
                  {errors.precioVenta && (
                    <p className="text-xs text-red-600">{errors.precioVenta.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Monto Venta
                  </Label>
                  <div className="h-10 px-3 py-2 border border-gray-300 bg-gray-50 rounded-md text-sm">
                    ${montoVenta.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Descuentos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Descuentos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="descuentoPorcentaje" className="text-sm font-medium text-gray-700">
                    Descuento | %
                  </Label>
                  <Input
                    id="descuentoPorcentaje"
                    type="number"
                    step="0.01"
                    max="100"
                    {...register("descuentoPorcentaje", { valueAsNumber: true })}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descuentoMxn" className="text-sm font-medium text-gray-700">
                    Descuento | mxn
                  </Label>
                  <Input
                    id="descuentoMxn"
                    type="number"
                    step="0.01"
                    {...register("descuentoMxn", { valueAsNumber: true })}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Total Orden | mxn
                  </Label>
                  <div className="h-10 px-3 py-2 border border-gray-300 bg-gray-50 rounded-md text-sm font-semibold">
                    ${totalOrden.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Método de Pago
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="metodoPago" className="text-sm font-medium text-gray-700">
                    Método de Pago *
                  </Label>
                  <Select onValueChange={(value) => setValue("metodoPago", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockData.metodosPago.map((metodo) => (
                        <SelectItem key={metodo.id} value={metodo.name}>
                          {metodo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.metodoPago && (
                    <p className="text-xs text-red-600">{errors.metodoPago.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="formaPago" className="text-sm font-medium text-gray-700">
                    Forma de Pago *
                  </Label>
                  <Select onValueChange={(value) => setValue("formaPago", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Seleccionar forma" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockData.formasPago.map((forma) => (
                        <SelectItem key={forma.id} value={forma.name}>
                          {forma.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.formaPago && (
                    <p className="text-xs text-red-600">{errors.formaPago.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estatusPagoCliente" className="text-sm font-medium text-gray-700">
                    Estatus Pago | Cliente *
                  </Label>
                  <Select onValueChange={(value) => setValue("estatusPagoCliente", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Seleccionar estatus" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockData.estatusPagoCliente.map((estatus) => (
                        <SelectItem key={estatus.id} value={estatus.name}>
                          {estatus.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.estatusPagoCliente && (
                    <p className="text-xs text-red-600">{errors.estatusPagoCliente.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estatusDeposito" className="text-sm font-medium text-gray-700">
                    Estatus Depósito | MV
                  </Label>
                  <Select onValueChange={(value) => setValue("estatusDeposito", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Seleccionar estatus" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockData.estatusDeposito.map((estatus) => (
                        <SelectItem key={estatus.id} value={estatus.name}>
                          {estatus.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="folioTransferencia" className="text-sm font-medium text-gray-700">
                    Folio Depósito | Transferencia
                  </Label>
                  <Input
                    id="folioTransferencia"
                    {...register("folioTransferencia")}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    placeholder="Folio de transferencia"
                  />
                </div>
              </div>
            </div>

            {/* Facturación */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Facturación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoFactura" className="text-sm font-medium text-gray-700">
                    Tipo de Factura
                  </Label>
                  <Select onValueChange={(value) => setValue("tipoFactura", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockData.tiposFactura.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.name}>
                          {tipo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usoCfdi" className="text-sm font-medium text-gray-700">
                    Uso del CFDI
                  </Label>
                  <Input
                    id="usoCfdi"
                    {...register("usoCfdi")}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    placeholder="Uso del CFDI"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estatusFactura" className="text-sm font-medium text-gray-700">
                    Estatus Factura
                  </Label>
                  <Select onValueChange={(value) => setValue("estatusFactura", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Seleccionar estatus" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockData.estatusFactura.map((estatus) => (
                        <SelectItem key={estatus.id} value={estatus.name}>
                          {estatus.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="px-8 border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Limpiar
              </Button>
              <Button
                type="submit"
                className="px-8 bg-gray-900 hover:bg-gray-800 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Registrando..." : "Registrar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}