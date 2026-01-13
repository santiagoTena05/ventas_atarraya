/**
 * Utilidades para convertir entre diferentes sistemas de tallas de camarón
 * Basado en equivalencias comerciales estándar
 */

// Mapeo de gramos por pieza → conteo por kg
export const TALLA_CONVERSIONS = {
  // Muy pequeño (+ de 70 piezas por kg)
  '8-9.9': '71-80',
  '6-7.9': '81-90',
  '4-5.9': '91-100',

  // Pequeño
  '10-11.9': '61-70',
  '12-15.9': '51-60',

  // Mediano
  '16-20.9': '41-50',
  '21-25.9': '31-40',

  // Grande
  '26-30.9': '26-30',
  '31-35.9': '21-25',

  // Extra Grande
  '36-40.9': '16-20',
  '41-50.9': '11-15',

  // Jumbo
  '51-60.9': '8-10',
  '61+': '1-7'
} as const;

// Rangos comerciales que maneja el playground
export const TALLAS_COMERCIALES_RANGES = [
  { label: '61-70', min: 61, max: 70 },
  { label: '51-60', min: 51, max: 60 },
  { label: '41-50', min: 41, max: 50 },
  { label: '31-40', min: 31, max: 40 },
  { label: '31-35', min: 31, max: 35 },
  { label: '26-30', min: 26, max: 30 },
  { label: '21-25', min: 21, max: 25 },
  { label: '16-20', min: 16, max: 20 }
];

/**
 * Convierte peso en gramos por pieza a conteo por kg (talla comercial)
 */
export function gramosToConteoKg(gramosPerPiece: number): string {
  if (gramosPerPiece <= 0) return '61-70'; // Default para valores inválidos

  const conteoPerKg = Math.round(1000 / gramosPerPiece);

  // Buscar el rango comercial apropiado
  for (const range of TALLAS_COMERCIALES_RANGES) {
    if (conteoPerKg >= range.min && conteoPerKg <= range.max) {
      return range.label;
    }
  }

  // Fallback logic
  if (conteoPerKg > 70) return '61-70'; // Más pequeño que nuestros rangos
  if (conteoPerKg < 16) return '16-20'; // Más grande que nuestros rangos

  return '41-50'; // Default central
}

/**
 * Convierte peso en gramos a libras
 */
export function gramosToLibras(gramos: number): number {
  return gramos / 453.592;
}

/**
 * Convierte libras a kilogramos
 */
export function librasToKilos(libras: number): number {
  return libras * 0.453592;
}

/**
 * Obtiene distribución porcentual por tallas para una población
 * Basado en curvas de crecimiento típicas del camarón
 */
export function getDistribucionTallas(pesoPromedio: number): Record<string, number> {
  const tallaPromedio = gramosToConteoKg(pesoPromedio);

  // Distribución gaussiana simplificada alrededor del peso promedio
  const distribuciones: Record<string, Record<string, number>> = {
    '61-70': { '61-70': 0.7, '51-60': 0.2, '41-50': 0.1 },
    '51-60': { '61-70': 0.1, '51-60': 0.6, '41-50': 0.2, '31-40': 0.1 },
    '41-50': { '51-60': 0.1, '41-50': 0.6, '31-40': 0.2, '26-30': 0.1 },
    '31-40': { '41-50': 0.1, '31-40': 0.6, '26-30': 0.2, '21-25': 0.1 },
    '31-35': { '31-40': 0.3, '31-35': 0.5, '26-30': 0.2 },
    '26-30': { '31-40': 0.1, '26-30': 0.6, '21-25': 0.2, '16-20': 0.1 },
    '21-25': { '26-30': 0.1, '21-25': 0.6, '16-20': 0.3 },
    '16-20': { '21-25': 0.2, '16-20': 0.8 }
  };

  return distribuciones[tallaPromedio] || { '41-50': 1.0 };
}

/**
 * Calcula biomasa disponible por talla comercial
 */
export function calcularBiomasaPorTalla(
  biomasaTotal: number, // en kg
  pesoPromedio: number,  // gramos por pieza
  poblacion: number
): Record<string, number> {
  const distribucion = getDistribucionTallas(pesoPromedio);
  const biomasaPorTalla: Record<string, number> = {};

  // Distribuir la biomasa total según los porcentajes
  for (const [talla, porcentaje] of Object.entries(distribucion)) {
    biomasaPorTalla[talla] = biomasaTotal * porcentaje;
  }

  return biomasaPorTalla;
}

// Tipo para los datos de proyección del planner
export interface PlannerProjection {
  tankId: number;
  week: number;
  date: string;
  averageWeight: number; // gramos
  totalBiomass: number;  // kg
  population: number;
  generation: string;
  genetics: string;
  isRealData?: boolean;
}

/**
 * Convierte proyecciones del planner a formato del playground
 */
export function convertPlannerToPlayground(projections: PlannerProjection[]): Record<string, Record<string, number>> {
  const playgroundData: Record<string, Record<string, number>> = {};

  for (const projection of projections) {
    const weekKey = projection.date;

    if (!playgroundData[weekKey]) {
      playgroundData[weekKey] = {};
    }

    // Calcular biomasa por talla comercial
    const biomasaPorTalla = calcularBiomasaPorTalla(
      projection.totalBiomass,
      projection.averageWeight,
      projection.population
    );

    // Acumular por semana/talla
    for (const [talla, biomasa] of Object.entries(biomasaPorTalla)) {
      if (!playgroundData[weekKey][talla]) {
        playgroundData[weekKey][talla] = 0;
      }
      playgroundData[weekKey][talla] += biomasa;
    }
  }

  return playgroundData;
}