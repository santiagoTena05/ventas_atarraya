import { z } from "zod";

// Schema para una entrada de cosecha (estanque + peso + talla)
export const entradaCosechaSchema = z.object({
  estanqueId: z.number().min(1, "Debe seleccionar un estanque"),
  tallaId: z.number().min(1, "Debe seleccionar una talla"),
  pesoKg: z.number().min(0.001, "El peso debe ser mayor a 0").max(10000, "Peso máximo 10,000 kg"),
});

// Schema principal para el formulario de cosecha simplificado
export const cosechaSchema = z.object({
  // Datos administrativos
  responsable: z.string().min(1, "Responsable es requerido"),
  fechaCosecha: z.string().min(1, "Fecha de cosecha es requerida"),

  // Peso total (calculado automáticamente)
  pesoTotalKg: z.number().min(0.001, "El peso total debe ser mayor a 0").max(50000, "Peso máximo 50,000 kg"),

  // Entradas de cosecha (estanque + talla + peso)
  entradas: z.array(entradaCosechaSchema).min(1, "Debe incluir al menos una entrada"),

  // Notas opcionales
  notas: z.string().optional(),
});

export type CosechaFormData = z.infer<typeof cosechaSchema>;
export type EntradaCosechaData = z.infer<typeof entradaCosechaSchema>;

// Interfaces para los datos de Supabase
export interface CosechaRegistrada {
  id: number;
  folio: number;
  responsable: string;
  oficina: string;
  fechaCosecha: string;
  pesoTotalKg: number;
  estado: 'pendiente' | 'procesada' | 'vendida';
  notas?: string;
  estanques: Array<{
    id: number;
    nombre: string;
    pesoKg: number;
    porcentaje: number;
  }>;
  tallas: Array<{
    id: number;
    nombre: string;
    pesoKg: number;
    porcentaje: number;
  }>;
  createdAt: string;
  // Campos de inventario
  pesoVendidoKg?: number;
  pesoDisponibleKg?: number;
  porcentajeVendido?: number;
  estadoInventario?: 'disponible' | 'parcial' | 'agotado';
  totalVentas?: number;
}