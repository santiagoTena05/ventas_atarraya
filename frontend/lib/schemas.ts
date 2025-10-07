import { z } from "zod";

export const ventaSchema = z.object({
  // Datos administrativos (registro se genera automáticamente)
  oficina: z.string().min(1, "Oficina es requerida"),
  responsable: z.string().min(1, "Responsable es requerido"),
  regionMercado: z.string().min(1, "Región de mercado es requerida"),

  // Datos de cosecha
  notaSalidaGranja: z.string().optional(),
  fechaCosecha: z.string().min(1, "Fecha de cosecha es requerida"),
  fechaEntrega: z.string().min(1, "Fecha de entrega es requerida"),

  // Cliente
  cliente: z.string().min(1, "Cliente es requerido"),
  tipoCliente: z.string().min(1, "Tipo de cliente es requerido"),
  noOrdenAtarraya: z.string().optional(),

  // Producto
  tipoProducto: z.string().min(1, "Tipo de producto es requerido"),
  tallaCamaron: z.string().optional(),

  // Cantidades y precios
  enteroKgs: z.number().min(0, "Cantidad debe ser mayor a 0"),
  precioVenta: z.number().min(0, "Precio debe ser mayor a 0"),

  // Descuentos
  descuentoPorcentaje: z.number().min(0).max(100).optional(),
  descuentoMxn: z.number().min(0).optional(),

  // Método de pago
  metodoPago: z.string().min(1, "Método de pago es requerido"),

  // Datos de pago cliente
  formaPago: z.string().min(1, "Forma de pago es requerida"),
  estatusPagoCliente: z.string().min(1, "Estatus pago cliente es requerido"),

  // Datos depósito
  estatusDeposito: z.string().optional(),
  folioTransferencia: z.string().optional(),

  // Facturación
  tipoFactura: z.string().optional(),
  usoCfdi: z.string().optional(),
  estatusFactura: z.string().optional(),
});

export type VentaFormData = z.infer<typeof ventaSchema>;