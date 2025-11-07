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
  const [semanaSeleccionada, setSemanaSeleccionada] = useState<number>(1);

  // Estados para el registro de muestreos
  const [sesionActual, setSesionActual] = useState<SesionRegistro | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [estanqueActual, setEstanqueActual] = useState<EstanqueLocal | null>(null);
  const [valores, setValores] = useState<number[]>([]);
  const [cosecha, setCosecha] = useState<number>(0);
  const [indiceMuestreo, setIndiceMuestreo] = useState(0);
  const [modoRegistroCosecha, setModoRegistroCosecha] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Función para iniciar sesión de registro
  const iniciarSesion = () => {
    if (!fechaSeleccionada || !generacionSeleccionada) return;

    const nuevaSesion: SesionRegistro = {
      fecha: fechaSeleccionada,
      generacion: generacionSeleccionada,
      semana: semanaSeleccionada,
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
      const promedio = calcularPromedio(datos.valores);

      muestreosTransformados[estanqueId] = {
        estanqueId: parseInt(estanqueId),
        muestreos: datos.valores,
        promedio,
        biomasa: calcularBiomasa(promedio, estanque?.area || 540),
        cosecha: datos.cosecha
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
      setSemanaSeleccionada(1);
      setEstanques(prev => prev.map(e => ({ ...e, completado: false })));
    } else {
      alert('Error al guardar la sesión. Inténtalo de nuevo.');
    }
  };

  // Verificar si todas las mediciones están completas
  const todasLasMedicionesCompletas = () => {
    return estanquesActivos.every(e => e.completado);
  };


  const calcularPromedio = (vals: number[]) => {
    if (vals.length === 0) return 0;
    return vals.reduce((sum, val) => sum + val, 0) / vals.length;
  };

  const calcularBiomasa = (promedio: number, area: number) => {
    // Convertir de gramos a kg y multiplicar por área
    return (promedio / 1000) * area;
  };

  const abrirModal = (estanque: EstanqueLocal) => {
    setEstanqueActual(estanque);
    setValores([]);
    setCosecha(0);
    setIndiceMuestreo(0);
    setModoRegistroCosecha(false);
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
    setCosecha(0);
    setIndiceMuestreo(0);
    setModoRegistroCosecha(false);
  };

  const completarEstanque = () => {
    if (!estanqueActual || !sesionActual) return;

    // Guardar datos del estanque en la sesión
    const nuevosSesionActual = {
      ...sesionActual,
      muestreos: {
        ...sesionActual.muestreos,
        [estanqueActual.id]: {
          valores: [...valores],
          cosecha: cosecha
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
        setModoRegistroCosecha(true);
        setIndiceMuestreo(0);
      } else {
        setIndiceMuestreo(indiceMuestreo + 1);
      }

      (e.target as HTMLInputElement).value = '';
    }
  };

  const manejarCosechaEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const valor = parseFloat((e.target as HTMLInputElement).value);
      setCosecha(valor || 0);
      completarEstanque();
    }
  };

  useEffect(() => {
    if (modalAbierto && inputRef.current) {
      inputRef.current.focus();
    }
  }, [modalAbierto, indiceMuestreo, modoRegistroCosecha]);

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

              <div>
                <Label htmlFor="semana">Semana de Cultivo</Label>
                <Input
                  id="semana"
                  type="number"
                  min="1"
                  max="30"
                  value={semanaSeleccionada}
                  onChange={(e) => setSemanaSeleccionada(parseInt(e.target.value) || 1)}
                  className="mt-1"
                  placeholder="Número de semana (ej: 1, 2, 3...)"
                />
              </div>

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
  const promedio = calcularPromedio(valores);
  const biomasa = estanqueActual ? calcularBiomasa(promedio, estanqueActual.area) : 0;

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
            {!modoRegistroCosecha ? (
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
                          <span className="text-gray-600">Promedio actual:</span>
                          <span className="font-medium">{promedio.toFixed(1)}g</span>
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
            ) : (
              // Modo cosecha
              <>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600 mb-2">
                    ¡Muestreos Completados!
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Promedio final:</span>
                      <span className="font-bold text-green-700">{promedio.toFixed(1)}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Biomasa total:</span>
                      <span className="font-bold text-green-700">{biomasa.toFixed(1)} kg</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cosecha semanal (kg) - Opcional:
                  </label>
                  <Input
                    ref={inputRef}
                    type="number"
                    placeholder="Ej: 25.5 (opcional)"
                    className="text-center text-lg font-semibold"
                    onKeyDown={manejarCosechaEnter}
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Presiona Enter para finalizar y continuar
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={completarEstanque}
                  >
                    Omitir cosecha
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