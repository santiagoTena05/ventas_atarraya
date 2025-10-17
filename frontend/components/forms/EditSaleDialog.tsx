"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ventaSchema, type VentaFormData } from "@/lib/schemas";
import { mockData } from "@/lib/mock-data";
import { useSales } from "@/lib/hooks/useSales";
import { type VentaRegistrada } from "@/lib/hooks/useSales";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditSaleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: number | null;
  salesHook: ReturnType<typeof useSales>;
}

export function EditSaleDialog({ isOpen, onClose, saleId, salesHook }: EditSaleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getSaleById, updateSale } = salesHook;

  const sale = saleId ? getSaleById(saleId) : null;

  const form = useForm<VentaFormData>({
    resolver: zodResolver(ventaSchema),
    defaultValues: {
      enteroKgs: 0,
      precioVenta: 0,
      descuentoPorcentaje: 0,
      descuentoMxn: 0,
    },
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = form;

  // Watch values for calculations
  const enteroKgs = Number(watch("enteroKgs")) || 0;
  const precioVenta = Number(watch("precioVenta")) || 0;
  const descuentoPorcentaje = Number(watch("descuentoPorcentaje")) || 0;
  const descuentoMxn = Number(watch("descuentoMxn")) || 0;

  // Calculate totals
  const montoVenta = useMemo(() => enteroKgs * precioVenta, [enteroKgs, precioVenta]);
  const descuentoCalculado = useMemo(() => {
    return (montoVenta * descuentoPorcentaje) / 100;
  }, [montoVenta, descuentoPorcentaje]);
  const totalOrden = useMemo(() => {
    return montoVenta - descuentoCalculado - descuentoMxn;
  }, [montoVenta, descuentoCalculado, descuentoMxn]);

  // Load sale data when dialog opens
  useEffect(() => {
    if (isOpen && sale) {
      reset({
        oficina: sale.oficina,
        responsable: sale.responsable,
        regionMercado: sale.regionMercado,
        notaSalidaGranja: sale.notaSalidaGranja || "",
        fechaCosecha: sale.fechaCosecha,
        fechaEntrega: sale.fechaEntrega,
        cliente: sale.cliente,
        tipoCliente: sale.tipoCliente,
        noOrdenAtarraya: sale.noOrdenAtarraya || "",
        tipoProducto: sale.tipoProducto,
        tallaCamaron: sale.tallaCamaron || "",
        enteroKgs: sale.enteroKgs,
        precioVenta: sale.precioVenta,
        descuentoPorcentaje: sale.descuentoPorcentaje,
        descuentoMxn: sale.descuentoMxn,
        metodoPago: sale.metodoPago,
        formaPago: sale.formaPago,
        estatusPagoCliente: sale.estatusPagoCliente,
        estatusDeposito: sale.estatusDeposito || "",
        folioTransferencia: sale.folioTransferencia || "",
        tipoFactura: sale.tipoFactura || "",
        usoCfdi: sale.usoCfdi || "",
        estatusFactura: sale.estatusFactura || "",
      });
    }
  }, [isOpen, sale, reset]);

  const onSubmit = async (data: VentaFormData) => {
    if (!sale) return;

    setIsSubmitting(true);
    try {
      updateSale(sale.id, data);
      alert(`Venta #${sale.folio.toString().padStart(4, '0')} actualizada exitosamente`);
      onClose();
    } catch (error) {
      console.error("Error al actualizar venta:", error);
      alert("Error al actualizar la venta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!sale) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[90vw] max-h-[95vh] overflow-y-auto w-[90vw] sm:!max-w-[90vw]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Editar Venta #{sale.folio.toString().padStart(4, '0')}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Actualiza los datos de la venta. Los campos con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 p-6">
          {/* Datos Administrativos */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">
              Datos Administrativos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <Label htmlFor="oficina" className="text-sm font-medium text-gray-700">
                  Oficina *
                </Label>
                <Select value={watch("oficina")} onValueChange={(value) => setValue("oficina", value)}>
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
                <Select value={watch("responsable")} onValueChange={(value) => setValue("responsable", value)}>
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
                <Select value={watch("regionMercado")} onValueChange={(value) => setValue("regionMercado", value)}>
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
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">
              Datos de Cosecha
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">
              Datos del Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                <Select value={watch("tipoCliente")} onValueChange={(value) => setValue("tipoCliente", value)}>
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
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">
              Datos del Producto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-2">
                <Label htmlFor="tipoProducto" className="text-sm font-medium text-gray-700">
                  Tipo de Producto *
                </Label>
                <Select value={watch("tipoProducto")} onValueChange={(value) => setValue("tipoProducto", value)}>
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
                <Select value={watch("tallaCamaron") || ""} onValueChange={(value) => setValue("tallaCamaron", value)}>
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
            </div>

            {/* Segunda fila: Monto Venta y Descuentos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Monto Venta
                </Label>
                <div className="h-10 px-3 py-2 border border-gray-300 bg-gray-50 rounded-md text-sm overflow-hidden">
                  <span className="block truncate">${montoVenta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

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
                <div className="h-10 px-3 py-2 border border-gray-300 bg-gray-50 rounded-md text-sm font-semibold overflow-hidden">
                  <span className="block truncate">${totalOrden.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Método de Pago */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">
              Método de Pago
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <Label htmlFor="metodoPago" className="text-sm font-medium text-gray-700">
                  Método de Pago *
                </Label>
                <Select value={watch("metodoPago")} onValueChange={(value) => setValue("metodoPago", value)}>
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
                <Select value={watch("formaPago")} onValueChange={(value) => setValue("formaPago", value)}>
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
                <Select value={watch("estatusPagoCliente")} onValueChange={(value) => setValue("estatusPagoCliente", value)}>
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
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-6 pt-8 border-t border-gray-200 mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="px-8 border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="px-8 bg-gray-900 hover:bg-gray-800 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Actualizando..." : "Actualizar Venta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}