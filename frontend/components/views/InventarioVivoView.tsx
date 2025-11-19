"use client";

import React, { useState, useRef, useEffect } from "react";
import { useEstanques } from "@/lib/hooks/useEstanques";
import { useMuestreos, type MuestreoEstanque } from "@/lib/hooks/useMuestreos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GenerationAutocomplete } from "@/components/ui/generation-autocomplete";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Droplets, CheckCircle, Clock, Calculator } from "lucide-react";

interface Muestreo {
  estanqueId: string;
  valores: number[];
  cosecha: number;
  fecha: string;
}

interface SesionRegistro {
  fecha: string;
  generacion: string;
  semana?: number;
  muestreos: { [estanqueId: string]: { valores: number[], cosecha: number } };
}

interface EstanqueLocal {
  id: string;
  nombre: string;
  codigo: string;
  area: number; // m2
  activo: boolean;
  completado?: boolean;
}

export function InventarioVivoView() {
  const { estanques: estanquesSupabase, isLoading: loadingEstanques, error } = useEstanques();
  const { sesiones, guardarSesion, loading: loadingSesiones } = useMuestreos();
  const [estanques, setEstanques] = useState<EstanqueLocal[]>([]);

  // Estados para el formulario inicial
  const [sesionIniciada, setSesionIniciada] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [generacionSeleccionada, setGeneracionSeleccionada] = useState('');

  // Estados para el registro de muestreos
  const [sesionActual, setSesionActual] = useState<SesionRegistro | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [estanqueActual, setEstanqueActual] = useState<EstanqueLocal | null>(null);
  const [valores, setValores] = useState<number[]>([]);
  const [indiceMuestreo, setIndiceMuestreo] = useState(0);
  const [modoRegistroCosecha, setModoRegistroCosecha] = useState(false);
  const [modoAverageSize, setModoAverageSize] = useState(false);
  const [muestreosSeleccionados, setMuestreosSeleccionados] = useState<number[]>([]);
  const [conteosCamarones, setConteosCamarones] = useState<{[key: number]: number}>({});
  const [esperandoConteo, setEsperandoConteo] = useState<number | null>(null);
  const [averageSizeManual, setAverageSizeManual] = useState<string>("");
  const [usarAverageSizeManual, setUsarAverageSizeManual] = useState(false);
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<'automatico' | 'manual'>('automatico');
  const [metodoElegido, setMetodoElegido] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const conteoInputRef = useRef<HTMLInputElement>(null);

  // Transformar datos de Supabase a formato local
  useEffect(() => {
    if (estanquesSupabase.length > 0) {
      const estanquesTransformados: EstanqueLocal[] = estanquesSupabase.map(est => ({
        id: est.id.toString(),
        nombre: est.nombre,
        codigo: est.codigo || `EST-${est.id.toString().padStart(2, '0')}`,
        area: est.area || 540,
        activo: est.activo !== false,
        completado: false
      }));
      setEstanques(estanquesTransformados);
    }
  }, [estanquesSupabase]);

  const estanquesActivos = estanques.filter(e => e.activo);
  const estanquesCompletados = estanques.filter(e => e.completado).length;

  // Función para calcular la semana del año basada en la fecha
  const calcularSemanaDelAno = (fecha: string): number => {
    if (!fecha) return 1;

    const fechaObj = new Date(fecha);
    const oneJan = new Date(fechaObj.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((fechaObj.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  };

  // Función para iniciar sesión de registro
  const iniciarSesion = () => {
    if (!fechaSeleccionada || !generacionSeleccionada) return;

    const semanaCalculada = calcularSemanaDelAno(fechaSeleccionada);

    const nuevaSesion: SesionRegistro = {
      fecha: fechaSeleccionada,
      generacion: generacionSeleccionada,
      semana: semanaCalculada,
      muestreos: {}
    };

    setSesionActual(nuevaSesion);
    setSesionIniciada(true);

    // Resetear estados de estanques
    setEstanques(prev => prev.map(e => ({ ...e, completado: false })));
  };

  // Función para continuar sesión guardada
  const continuarSesion = (sesionGuardada: any) => {
    const sesionContinuada: SesionRegistro = {
      fecha: sesionGuardada.fecha,
      generacion: sesionGuardada.generacion,
      semana: sesionGuardada.semana,
      muestreos: {}
    };

    // Convertir muestreos guardados al formato local
    Object.entries(sesionGuardada.muestreos).forEach(([estanqueId, muestreo]: [string, any]) => {
      sesionContinuada.muestreos[estanqueId] = {
        valores: muestreo.muestreos || [],
        cosecha: muestreo.cosecha || 0
      };
    });

    setSesionActual(sesionContinuada);
    setSesionIniciada(true);

    // Marcar estanques como completados si tienen datos
    setEstanques(prev => prev.map(e => ({
      ...e,
      completado: sesionContinuada.muestreos[e.id] ? true : false
    })));
  };

  // Función para guardar toda la sesión
  const guardarSesionCompleta = async (estado: 'completado' | 'en_progreso' = 'completado') => {
    if (!sesionActual) return;

    // Transformar datos al formato esperado por useMuestreos
    const muestreosTransformados: { [estanqueId: string]: MuestreoEstanque } = {};

    Object.entries(sesionActual.muestreos).forEach(([estanqueId, datos]) => {
      const estanque = estanques.find(e => e.id === estanqueId);
      const mediana = calcularMediana(datos.valores);

      muestreosTransformados[estanqueId] = {
        estanqueId: parseInt(estanqueId),
        muestreos: datos.valores,
        promedio: mediana, // Mantenemos el nombre 'promedio' por compatibilidad con la interfaz MuestreoEstanque
        biomasa: calcularBiomasa(mediana, estanque?.area || 540),
        cosecha: datos.cosecha,
        averageSize: datos.averageSize,
        muestreosSeleccionadosParaAverage: datos.muestreosSeleccionadosParaAverage,
        conteosCamarones: datos.conteosCamarones
      };
    });

    const sesionParaGuardar = {
      fecha: sesionActual.fecha,
      generacion: sesionActual.generacion,
      semana: sesionActual.semana,
      muestreos: muestreosTransformados,
      estado
    };

    const guardado = await guardarSesion(sesionParaGuardar);

    if (guardado) {
      const mensaje = estado === 'completado'
        ? `Sesión guardada exitosamente!\nFecha: ${sesionActual.fecha}\nGeneración: ${sesionActual.generacion}\nEstanques registrados: ${Object.keys(sesionActual.muestreos).length}`
        : `Sesión guardada como en progreso!\nFecha: ${sesionActual.fecha}\nGeneración: ${sesionActual.generacion}\nEstanques registrados: ${Object.keys(sesionActual.muestreos).length}\nPodrás continuar más tarde desde la lista de sesiones.`;

      alert(mensaje);

      // Resetear todo
      setSesionIniciada(false);
      setSesionActual(null);
      setFechaSeleccionada('');
      setGeneracionSeleccionada('');
      setEstanques(prev => prev.map(e => ({ ...e, completado: false })));
    } else {
      alert('Error al guardar la sesión. Inténtalo de nuevo.');
    }
  };

  // Verificar si todas las mediciones están completas
  const todasLasMedicionesCompletas = () => {
    return estanquesActivos.every(e => e.completado);
  };


  const calcularMediana = (vals: number[]) => {
    if (vals.length === 0) return 0;

    // Ordenar valores de menor a mayor
    const sortedVals = [...vals].sort((a, b) => a - b);
    const middle = Math.floor(sortedVals.length / 2);

    // Si la cantidad es impar, tomar el valor del medio
    if (sortedVals.length % 2 === 1) {
      return sortedVals[middle];
    }

    // Si la cantidad es par, tomar el promedio de los dos valores centrales
    return (sortedVals[middle - 1] + sortedVals[middle]) / 2;
  };

  const calcularBiomasa = (mediana: number, area: number) => {
    // Convertir de gramos a kg y multiplicar por área
    let biomasaCalculada = (mediana / 1000) * area;

    // Aplicar regla: si es mayor a 100kg, sumar 50kg
    if (biomasaCalculada > 100) {
      biomasaCalculada += 50;
    }

    // Redondear normalmente (0.5 hacia arriba)
    return Math.round(biomasaCalculada);
  };

  const calcularAverageSize = (muestreoSeleccionados: number[], conteosCamarones: {[key: number]: number}, valores: number[]) => {
    if (muestreoSeleccionados.length !== 2) return 0;

    let totalPeso = 0;
    let totalCamarones = 0;

    muestreoSeleccionados.forEach(indice => {
      const peso = valores[indice] || 0;
      const camarones = conteosCamarones[indice] || 0;
      totalPeso += peso;
      totalCamarones += camarones;
    });

    if (totalCamarones === 0) return 0;

    // Average Size = peso total / número total de camarones
    return Number((totalPeso / totalCamarones).toFixed(1));
  };

  const abrirModal = (estanque: EstanqueLocal) => {
    setEstanqueActual(estanque);
    setValores([]);
    setIndiceMuestreo(0);
    setModoRegistroCosecha(false);
    setModoAverageSize(false);
    setMuestreosSeleccionados([]);
    setConteosCamarones({});
    setEsperandoConteo(null);
    setAverageSizeManual("");
    setUsarAverageSizeManual(false);
    setMetodoElegido(false);
    setOpcionSeleccionada('automatico');
    setModalAbierto(true);
  };

  const saltarEstanque = () => {
    if (!estanqueActual) return;

    // Marcar estanque como completado sin datos
    setEstanques(prev =>
      prev.map(e =>
        e.id === estanqueActual.id
          ? { ...e, completado: true }
          : e
      )
    );

    siguienteEstanque();
  };

  const siguienteEstanque = () => {
    if (!estanqueActual) return;

    const indiceActual = estanquesActivos.findIndex(e => e.id === estanqueActual.id);
    const siguienteIndice = indiceActual + 1;

    if (siguienteIndice < estanquesActivos.length) {
      const siguiente = estanquesActivos[siguienteIndice];
      abrirModal(siguiente);
    } else {
      cerrarModal();
    }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEstanqueActual(null);
    setValores([]);
    setIndiceMuestreo(0);
    setModoRegistroCosecha(false);
    setModoAverageSize(false);
    setMuestreosSeleccionados([]);
    setConteosCamarones({});
    setEsperandoConteo(null);
    setAverageSizeManual("");
    setUsarAverageSizeManual(false);
    setOpcionSeleccionada('automatico');
    setMetodoElegido(false);
  };

  const completarEstanque = () => {
    if (!estanqueActual || !sesionActual) return;

    // Sin registro de cosecha, siempre es 0
    const valorCosecha = 0;

    // Calcular average size si hay datos
    const muestreosSeleccionadosParaAverage = Object.keys(conteosCamarones).map(Number);
    let averageSize = null;

    if (usarAverageSizeManual && averageSizeManual) {
      // Usar el valor manual ingresado
      averageSize = parseFloat(averageSizeManual);
    } else if (Object.keys(conteosCamarones).length === 2) {
      // Calcular automáticamente desde los conteos
      averageSize = calcularAverageSize(muestreosSeleccionadosParaAverage, conteosCamarones, valores);
    }

    // Guardar datos del estanque en la sesión
    const nuevosSesionActual = {
      ...sesionActual,
      muestreos: {
        ...sesionActual.muestreos,
        [estanqueActual.id]: {
          valores: [...valores],
          cosecha: valorCosecha,
          averageSize,
          muestreosSeleccionadosParaAverage,
          conteosCamarones: {...conteosCamarones}
        }
      }
    };
    setSesionActual(nuevosSesionActual);

    // Marcar estanque como completado
    setEstanques(prev =>
      prev.map(e =>
        e.id === estanqueActual.id
          ? { ...e, completado: true }
          : e
      )
    );

    siguienteEstanque();
  };

  const manejarEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (modoRegistroCosecha) {
        completarEstanque();
        return;
      }

      const valor = parseFloat((e.target as HTMLInputElement).value);

      if (isNaN(valor) || valor <= 0) {
        return;
      }

      const nuevosValores = [...valores, valor];
      setValores(nuevosValores);

      if (nuevosValores.length === 9) {
        setModoAverageSize(true);
        setIndiceMuestreo(0);
      } else {
        setIndiceMuestreo(indiceMuestreo + 1);
      }

      (e.target as HTMLInputElement).value = '';
    }
  };




  const seleccionarMuestreo = (indice: number) => {
    // Solo permitir selección si no hay un conteo pendiente y no hemos completado 2
    if (esperandoConteo === null && Object.keys(conteosCamarones).length < 2) {
      // No permitir seleccionar un muestreo que ya tiene conteo
      if (!conteosCamarones[indice]) {
        setEsperandoConteo(indice);
        setTimeout(() => {
          conteoInputRef.current?.focus();
        }, 100);
      }
    }
  };

  const manejarConteoEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const conteo = parseInt((e.target as HTMLInputElement).value);

      if (conteo > 0 && esperandoConteo !== null) {
        // Guardar el conteo
        setConteosCamarones(prev => ({
          ...prev,
          [esperandoConteo]: conteo
        }));

        // Limpiar el input y el estado de espera
        (e.target as HTMLInputElement).value = '';
        setEsperandoConteo(null);
      }
    }
  };

  const manejarTeclasNumericas = (e: KeyboardEvent) => {
    // Solo responder a teclas numéricas del 1 al 9 para selección si:
    // 1. No hay un conteo pendiente (esperandoConteo === null)
    // 2. El elemento activo no es un input (para evitar interferir con escritura)
    const elementoActivo = document.activeElement;
    const esInput = elementoActivo?.tagName === 'INPUT';

    if (esperandoConteo === null && !esInput && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const indice = parseInt(e.key) - 1; // Convertir a índice (0-8)
      if (indice < valores.length) {
        seleccionarMuestreo(indice);
      }
    }
  };

  const manejarEnterParaContinuar = (e: KeyboardEvent) => {
    // Permitir Enter para continuar cuando los 2 conteos están completos y validación de manual
    const puedeAvanzar = modoAverageSize &&
                         esperandoConteo === null &&
                         Object.keys(conteosCamarones).length === 2 &&
                         (!usarAverageSizeManual || (averageSizeManual && parseFloat(averageSizeManual) > 0));

    if (e.key === 'Enter' && puedeAvanzar) {
      e.preventDefault();
      setModoAverageSize(false);
      setModoRegistroCosecha(true);
    }
  };

  // Enfocar input cuando se abre modal en modo de registro de valores
  useEffect(() => {
    if (modalAbierto && !modoRegistroCosecha && !modoAverageSize && inputRef.current) {
      inputRef.current.focus();
    }
  }, [modalAbierto, modoRegistroCosecha, modoAverageSize]);

  // Listener para teclas numéricas en modo Average Size
  useEffect(() => {
    if (modoAverageSize && modalAbierto) {
      document.addEventListener('keydown', manejarTeclasNumericas);
      document.addEventListener('keydown', manejarEnterParaContinuar);
      return () => {
        document.removeEventListener('keydown', manejarTeclasNumericas);
        document.removeEventListener('keydown', manejarEnterParaContinuar);
      };
    }
  }, [modoAverageSize, modalAbierto, esperandoConteo, conteosCamarones, usarAverageSizeManual, averageSizeManual]);

  // Navegación con teclado para selección de método
  const manejarNavegacionMetodo = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      setOpcionSeleccionada('manual');
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setOpcionSeleccionada('automatico');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (opcionSeleccionada === 'manual') {
        setUsarAverageSizeManual(true);
        setMetodoElegido(true);
      } else {
        setUsarAverageSizeManual(false);
        setMetodoElegido(true);
      }
    }
  };

  useEffect(() => {
    if (modoAverageSize && modalAbierto && !metodoElegido) {
      document.addEventListener('keydown', manejarNavegacionMetodo);
      return () => {
        document.removeEventListener('keydown', manejarNavegacionMetodo);
      };
    }
  }, [modoAverageSize, modalAbierto, metodoElegido, opcionSeleccionada]);

  // Mostrar loading mientras cargan los estanques
  if (loadingEstanques) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estanques...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si hay problema cargando datos
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-600 mb-2">❌</div>
          <p className="text-gray-600">Error cargando estanques: {error}</p>
        </div>
      </div>
    );
  }

  // Mostrar mensaje si no hay estanques
  if (estanques.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Droplets className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay estanques activos disponibles</p>
          <p className="text-sm text-gray-500 mt-2">Agrega estanques desde el panel de administración</p>
        </div>
      </div>
    );
  }

  // Mostrar formulario inicial si no se ha iniciado sesión
  if (!sesionIniciada) {
    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Droplets className="h-8 w-8 text-blue-600" />
            Iniciar Registro de Muestreos
          </h1>
          <p className="text-gray-600 mt-2">
            Selecciona la fecha y generación para comenzar el registro
          </p>
        </div>

        {/* Formulario inicial */}
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Información de la Sesión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fecha">Fecha del Registro</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="generacion">Generación</Label>
                <GenerationAutocomplete
                  value={generacionSeleccionada}
                  onChange={setGeneracionSeleccionada}
                  placeholder="Buscar o crear generación..."
                  className="mt-1"
                />
              </div>

              {fechaSeleccionada && (
                <div>
                  <Label>Semana del Año (Calculada Automáticamente)</Label>
                  <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-700">
                        Semana {calcularSemanaDelAno(fechaSeleccionada)} del {new Date(fechaSeleccionada).getFullYear()}
                      </span>
                      <span className="text-xs text-blue-600">
                        Automático
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Calculada basada en la fecha seleccionada
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={iniciarSesion}
                disabled={!fechaSeleccionada || !generacionSeleccionada}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Iniciar Registro de Muestreos
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sesiones guardadas en progreso */}
        {!loadingSesiones && sesiones.filter(s => s.estado === 'en_progreso').length > 0 && (
          <div className="max-w-2xl mx-auto mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Sesiones en Progreso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4 text-center">
                  Continúa una sesión de muestreos que dejaste pendiente
                </p>
                <div className="space-y-2">
                  {sesiones
                    .filter(s => s.estado === 'en_progreso')
                    .slice(0, 5)
                    .map((sesion) => (
                      <div
                        key={sesion.id}
                        className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50 hover:bg-orange-100 cursor-pointer transition-colors"
                        onClick={() => continuarSesion(sesion)}
                      >
                        <div>
                          <div className="font-medium text-orange-900">
                            {sesion.generacion} - {sesion.fecha}
                          </div>
                          <div className="text-sm text-orange-700">
                            Semana {sesion.semana} • {Object.keys(sesion.muestreos).length} estanques registrados
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-orange-500 text-orange-600 hover:bg-orange-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            continuarSesion(sesion);
                          }}
                        >
                          Continuar
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Información adicional */}
        <div className="max-w-2xl mx-auto mt-8">
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Droplets className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Proceso de Registro
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Registrarás 9 muestreos por cada estanque activo ({estanquesActivos.length} estanques)</li>
                    <li>• Usa Enter para avanzar rápidamente entre campos</li>
                    <li>• Puedes saltar estanques o finalizar sesiones incompletas</li>
                    <li>• Al final podrás guardar toda la información de una vez</li>
                    <li>• Los datos se usarán para generar las tablas de análisis</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const progreso = (valores.length / 9) * 100;
  const mediana = calcularMediana(valores);
  const biomasa = estanqueActual ? calcularBiomasa(mediana, estanqueActual.area) : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Droplets className="h-6 w-6 text-blue-600" />
            Registro de Muestreos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {sesionActual?.fecha} - {sesionActual?.generacion}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Progreso del registro</div>
          <div className="text-lg font-semibold text-green-600">
            {estanquesCompletados} / {estanquesActivos.length} estanques
          </div>
          <div className="flex gap-2 mt-2">
            {todasLasMedicionesCompletas() && (
              <Button
                onClick={() => guardarSesionCompleta('completado')}
                className="bg-green-600 hover:bg-green-700"
              >
                Guardar Registro Completo
              </Button>
            )}
            {Object.keys(sesionActual?.muestreos || {}).length > 0 && (
              <Button
                onClick={() => guardarSesionCompleta('en_progreso')}
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                Finalizar Sesión
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grid de estanques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {estanquesActivos.map((estanque) => (
          <Card
            key={estanque.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              estanque.completado
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-blue-400'
            }`}
            onClick={() => !estanque.completado && abrirModal(estanque)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{estanque.nombre}</span>
                {estanque.completado ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
              </CardTitle>
              <p className="text-sm text-gray-600">{estanque.codigo}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Área:</span>
                  <span className="font-medium">{estanque.area} m²</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`font-medium ${
                    estanque.completado ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {estanque.completado ? 'Completado' : 'Pendiente'}
                  </span>
                </div>
              </div>

              {!estanque.completado && (
                <Button
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    abrirModal(estanque);
                  }}
                >
                  Registrar Muestreos
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Información de la sesión actual */}
      {todasLasMedicionesCompletas() && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">
                    ¡Todos los muestreos completados!
                  </h3>
                  <p className="text-sm text-green-700">
                    Ya puedes guardar el registro completo de la sesión
                  </p>
                </div>
              </div>
              <Button
                onClick={() => guardarSesionCompleta('completado')}
                className="bg-green-600 hover:bg-green-700"
              >
                Guardar Registro Completo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de registro */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-600" />
              {estanqueActual?.nombre}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {!modoRegistroCosecha && !modoAverageSize ? (
              // Modo muestreos
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    Muestreo {indiceMuestreo + 1}/9
                  </div>
                  <Progress value={progreso} className="h-2" />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor en gramos:
                    </label>
                    <Input
                      ref={inputRef}
                      type="number"
                      placeholder="Ej: 145"
                      className="text-center text-lg font-semibold"
                      onKeyDown={manejarEnter}
                      min="0"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Presiona Enter para continuar
                    </p>
                  </div>

                  {valores.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calculator className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">
                          Cálculos actuales:
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Valores registrados:</span>
                          <span className="font-medium">{valores.length}/9</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mediana actual:</span>
                          <span className="font-medium">{mediana.toFixed(1)}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Biomasa estimada:</span>
                          <span className="font-medium">{biomasa.toFixed(1)} kg</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {valores.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Valores registrados:</div>
                      <div className="flex flex-wrap gap-1">
                        {valores.map((valor, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium"
                          >
                            {valor}g
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : modoAverageSize ? (
              // Modo selección de método para average size
              <>
                {!metodoElegido ? (
                  // Primera vista: elegir método
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <div className="text-lg font-bold text-teal-600 mb-2">
                        ¿Cómo quieres determinar el average size?
                      </div>
                      <p className="text-sm text-gray-600">
                        Elige el método que prefieras usar
                      </p>
                    </div>

                    {/* Opción 1: Calcular automáticamente */}
                    <div
                      className={`border-2 rounded-lg p-4 transition-colors cursor-pointer ${
                        opcionSeleccionada === 'automatico'
                          ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-blue-200 hover:border-blue-300'
                      }`}
                      onClick={() => {
                        setUsarAverageSizeManual(false);
                        setMetodoElegido(true);
                      }}
                      onMouseEnter={() => setOpcionSeleccionada('automatico')}
                    >
                      <div className="w-full text-left">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <span className="text-blue-600 font-bold">🔢</span>
                          </div>
                          <div>
                            <div className="font-semibold text-blue-700">Calcular automáticamente</div>
                            <div className="text-sm text-gray-600">Seleccionar 2 muestreos y contar camarones</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Opción 2: Ingresar manualmente */}
                    <div
                      className={`border-2 rounded-lg p-4 transition-colors cursor-pointer ${
                        opcionSeleccionada === 'manual'
                          ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-200'
                          : 'border-purple-200 hover:border-purple-300'
                      }`}
                      onClick={() => {
                        setUsarAverageSizeManual(true);
                        setMetodoElegido(true);
                      }}
                      onMouseEnter={() => setOpcionSeleccionada('manual')}
                    >
                      <div className="w-full text-left">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="bg-purple-100 p-2 rounded-full">
                            <span className="text-purple-600 font-bold">✏️</span>
                          </div>
                          <div>
                            <div className="font-semibold text-purple-700">Ingresar manualmente</div>
                            <div className="text-sm text-gray-600">Ya tengo el average size calculado</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Instrucciones de teclado */}
                    <div className="text-center text-sm text-gray-500 mt-4">
                      <p>Usa las flechas ↑↓ para navegar y <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> para seleccionar</p>
                    </div>
                  </div>
                ) : usarAverageSizeManual ? (
                  // Vista manual
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <div className="text-lg font-bold text-purple-600 mb-2">
                        Ingresar Average Size
                      </div>
                      <p className="text-sm text-gray-600">
                        Introduce el valor que calculaste previamente
                      </p>
                    </div>

                    <div className="bg-purple-50 p-6 rounded-lg">
                      <label className="block text-sm font-medium text-purple-700 mb-2 text-center">
                        Average Size (gramos):
                      </label>
                      <Input
                        type="number"
                        placeholder="Ej: 12.5"
                        value={averageSizeManual}
                        onChange={(e) => setAverageSizeManual(e.target.value)}
                        className="text-center text-2xl font-bold py-3"
                        step="0.1"
                        min="0"
                        autoFocus
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setUsarAverageSizeManual(false);
                          setAverageSizeManual("");
                          setMetodoElegido(false);
                        }}
                        className="flex-1"
                      >
                        Atrás
                      </Button>
                      <Button
                        onClick={() => {
                          // Actualizar los datos de sesión con el average size manual
                          if (estanqueActual && sesionActual) {
                            const nuevosSesionActual = {
                              ...sesionActual,
                              muestreos: {
                                ...sesionActual.muestreos,
                                [estanqueActual.id]: {
                                  ...(sesionActual.muestreos[estanqueActual.id] || {}),
                                  valores: [...valores],
                                  averageSize: parseFloat(averageSizeManual),
                                  muestreosSeleccionadosParaAverage: [],
                                  conteosCamarones: {}
                                }
                              }
                            };
                            setSesionActual(nuevosSesionActual);
                          }
                          setModoAverageSize(false);
                          setModoRegistroCosecha(true);
                        }}
                        disabled={!averageSizeManual || parseFloat(averageSizeManual) <= 0}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400"
                      >
                        Continuar
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Vista automática (original)
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <div className="text-lg font-bold text-teal-600 mb-2">
                        Selecciona 2 muestreos para average size
                      </div>
                      <p className="text-sm text-gray-600">
                        Haz clic en los muestreos o presiona los números del 1 al 9
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setUsarAverageSizeManual(false);
                          setConteosCamarones({});
                          setEsperandoConteo(null);
                          setMetodoElegido(false);
                        }}
                        className="mt-2 text-xs"
                      >
                        ← Cambiar método
                      </Button>
                    </div>

                {/* Muestreos registrados con índices */}
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <div className="text-sm text-blue-700 font-medium mb-3">Muestreos registrados:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {valores.map((valor, idx) => {
                      const tieneConteo = conteosCamarones[idx] !== undefined;
                      const estaSeleccionado = esperandoConteo === idx;
                      const puedeSeleccionar = !tieneConteo && esperandoConteo === null && Object.keys(conteosCamarones).length < 2;

                      return (
                        <button
                          key={idx}
                          onClick={() => seleccionarMuestreo(idx)}
                          disabled={!puedeSeleccionar}
                          className={`relative p-3 rounded-lg border-2 transition-all ${
                            estaSeleccionado
                              ? 'border-yellow-500 bg-yellow-100 text-yellow-800'
                              : tieneConteo
                              ? 'border-teal-500 bg-teal-100 text-teal-800'
                              : puedeSeleccionar
                              ? 'border-blue-200 bg-blue-100 text-blue-800 hover:border-blue-300'
                              : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {/* Índice del muestreo */}
                          <div className="absolute -top-1 -left-1 bg-gray-700 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                            {idx + 1}
                          </div>

                          {/* Valor del muestreo */}
                          <div className="text-lg font-bold">{valor}g</div>

                          {/* Estado */}
                          {tieneConteo && (
                            <div className="absolute -top-1 -right-1 bg-teal-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                              ✓
                            </div>
                          )}
                          {estaSeleccionado && (
                            <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                              ⏳
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Progreso de conteo */}
                  <div className="mt-3 text-center text-sm text-gray-600">
                    Conteos completados: {Object.keys(conteosCamarones).length}/2
                  </div>
                </div>

                {/* Input para conteo de camarones */}
                {esperandoConteo !== null && (
                  <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Conteo de camarones para muestreo #{esperandoConteo + 1} ({valores[esperandoConteo]}g):
                    </label>
                    <Input
                      ref={conteoInputRef}
                      type="number"
                      placeholder="Número de camarones"
                      className="text-center text-lg font-semibold"
                      onKeyDown={manejarConteoEnter}
                      min="1"
                      step="1"
                    />
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Presiona Enter para confirmar
                    </p>
                  </div>
                )}

                {/* Resumen de conteos */}
                {Object.keys(conteosCamarones).length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <div className="text-sm text-gray-700 font-medium mb-2">Conteos registrados:</div>
                    <div className="space-y-1">
                      {Object.entries(conteosCamarones).map(([indice, conteo]) => (
                        <div key={indice} className="flex justify-between text-sm">
                          <span>Muestreo #{parseInt(indice) + 1} ({valores[parseInt(indice)]}g):</span>
                          <span className="font-medium">{conteo} camarones</span>
                        </div>
                      ))}
                    </div>
                    {Object.keys(conteosCamarones).length === 2 && (
                      <div className="mt-3 pt-3 border-t text-center">
                        <div className="text-sm text-teal-700 font-medium">
                          Average Size: {calcularAverageSize(Object.keys(conteosCamarones).map(Number), conteosCamarones, valores).toFixed(1)}g
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Botón para continuar */}
                {Object.keys(conteosCamarones).length === 2 && (
                  <div className="flex flex-col items-center space-y-2">
                    <Button
                      onClick={() => {
                        setModoAverageSize(false);
                        setModoRegistroCosecha(true);
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      Continuar
                    </Button>
                    <p className="text-xs text-gray-500">
                      Presiona Enter para continuar
                    </p>
                  </div>
                )}
                  </div>
                )}
              </>
            ) : (
              // Resumen final
              <>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600 mb-2">
                    ¡Muestreos Completados!
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mediana final:</span>
                      <span className="font-bold text-green-700">{mediana.toFixed(1)}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Biomasa total:</span>
                      <span className="font-bold text-green-700">{biomasa.toFixed(1)} kg</span>
                    </div>
                    {Object.keys(conteosCamarones).length === 2 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average size:</span>
                        <span className="font-bold text-green-700">
                          {calcularAverageSize(Object.keys(conteosCamarones).map(Number), conteosCamarones, valores).toFixed(1)}g
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={completarEstanque}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    Finalizar Muestreos
                  </Button>
                </div>
              </>
            )}

            <div className="flex gap-2 justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={cerrarModal}
                className="text-gray-500"
              >
                Cancelar (ESC)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={saltarEstanque}
                className="text-orange-600 border-orange-500 hover:bg-orange-50"
              >
                Saltar estanque
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}