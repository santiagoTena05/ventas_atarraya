"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cosechaSchema, type CosechaFormData } from "@/lib/schemas-cosecha";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { formatWeight, formatCurrency } from "@/lib/utils/formatters";
import { useCosechas } from "@/lib/hooks/useCosechas";
import { usePedidos, type Pedido } from "@/lib/hooks/usePedidos";
import { usePrecios, type CalculoPrecio } from "@/lib/hooks/usePrecios";
import { mockData } from "@/lib/mock-data";
import { Autocomplete } from "@/components/ui/autocomplete";
import { AddClientDialog } from "./AddClientDialog";

interface CosechaFormProps {
  onCosechaRegistered?: () => void;
}

interface Responsable {
  id: number;
  nombre: string;
}

interface Estanque {
  id: number;
  nombre: string;
}

interface Talla {
  id: number;
  nombre: string;
}

export function CosechaForm({ onCosechaRegistered }: CosechaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [estanques, setEstanques] = useState<Estanque[]>([]);
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [pedidosDisponibles, setPedidosDisponibles] = useState<Pedido[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Estados para venta inmediata
  const [esVentaInmediata, setEsVentaInmediata] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [tiposCliente, setTiposCliente] = useState<any[]>([]);
  const [oficinas, setOficinas] = useState<any[]>([]);
  const [calculoPrecio, setCalculoPrecio] = useState<CalculoPrecio | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [datosVenta, setDatosVenta] = useState({
    clienteId: '',
    tipoClienteId: '',
    oficinaId: '',
    enteroKgs: 0,
    descuentoPorcentaje: 0,
    descuentoMxn: 0,
    metodoPago: '',
    formaPago: '',
    estatusPagoCliente: '',
    folioTransferencia: '',
    tipoFactura: '',
    usoCfdi: '',
    estatusFactura: ''
  });

  const { addCosecha, getNextFolio } = useCosechas();
  const { pedidos } = usePedidos();
  const { calcularPrecioInmediato } = usePrecios();

  const form = useForm<CosechaFormData>({
    resolver: zodResolver(cosechaSchema),
    defaultValues: {
      responsable: "",
      fechaCosecha: new Date().toISOString().slice(0, 16), // Formato correcto: YYYY-MM-DDTHH:MM
      pesoTotalKg: 0,
      entradas: [{ estanqueId: 1, tallaId: 1, pesoKg: 0.001 }],
      notas: "",
    },
  });

  const { register, handleSubmit, watch, setValue, control, getValues, formState: { errors } } = form;

  // Filtrar pedidos disponibles (que no estén completados)
  useEffect(() => {
    const pedidosFiltrados = pedidos.filter(pedido =>
      pedido.estatus === 'Pendiente' || pedido.estatus === 'En Proceso' || pedido.estatus === 'Lista para Entrega'
    );
    setPedidosDisponibles(pedidosFiltrados);
  }, [pedidos]);

  // Field array para entradas de cosecha
  const { fields: entradasFields, append: appendEntrada, remove: removeEntrada } = useFieldArray({
    control,
    name: "entradas"
  });

  // Cargar datos desde Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);

        // Cargar responsables directamente de la tabla responsables
        const { data: responsablesData } = await supabase
          .from('responsables')
          .select('id, nombre');

        if (responsablesData) {
          setResponsables(responsablesData);
        }

        // Cargar estanques directamente de la tabla estanques
        const { data: estanquesData } = await supabase
          .from('estanques')
          .select('id, nombre');

        if (estanquesData && estanquesData.length > 0) {
          setEstanques(estanquesData);
        } else {
          // Fallback si no hay estanques en la tabla
          setEstanques([
            { id: 1, nombre: 'Estanque 1' },
            { id: 2, nombre: 'Estanque 2' },
            { id: 3, nombre: 'Estanque 3' }
          ]);
        }

        // Cargar tallas directamente de la tabla tallas_camaron
        const { data: tallasData } = await supabase
          .from('tallas_camaron')
          .select('id, nombre');

        if (tallasData) {
          setTallas(tallasData);
        }

      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Cargar datos para venta inmediata
  const loadVentaData = async () => {
    try {
      console.log("🔄 Cargando datos para venta...");

      const [clientesRes, tiposRes, oficinasRes] = await Promise.all([
        supabase.from('clientes').select('id, nombre, telefono, email').eq('activo', true).order('nombre'),
        supabase.from('tipos_cliente').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('oficinas').select('id, nombre').eq('activa', true).order('nombre')
      ]);

      if (clientesRes.data) setClientes(clientesRes.data);
      if (tiposRes.data) setTiposCliente(tiposRes.data);
      if (oficinasRes.data) setOficinas(oficinasRes.data);

      console.log("✅ Datos de venta cargados");
    } catch (error) {
      console.error("❌ Error cargando datos de venta:", error);
    }
  };

  // Cargar datos de venta cuando se activa la opción
  useEffect(() => {
    if (esVentaInmediata) {
      loadVentaData();
    }
  }, [esVentaInmediata]);

  // Watch all form fields for reactive updates
  const watchAllFields = watch();

  // Calcular precio automáticamente cuando cambien los datos de venta
  useEffect(() => {
    const recalcularPrecio = async () => {
      if (!esVentaInmediata || !datosVenta.tipoClienteId || !datosVenta.enteroKgs || datosVenta.enteroKgs <= 0) {
        setCalculoPrecio(null);
        return;
      }

      try {
        setIsCalculatingPrice(true);
        console.log('💰 Calculando precio automático para venta inmediata...', {
          tipoCliente: datosVenta.tipoClienteId,
          enteroKgs: datosVenta.enteroKgs,
          descuentoPorcentaje: datosVenta.descuentoPorcentaje || 0,
          descuentoMxn: datosVenta.descuentoMxn || 0
        });

        // Usar la talla predominante de la cosecha (primera talla)
        const tallaId = watchAllFields.entradas?.[0]?.tallaId || 1;

        const resultado = await calcularPrecioInmediato(
          tallaId, // Usar talla directamente para venta inmediata
          datosVenta.tipoClienteId,
          datosVenta.enteroKgs,
          datosVenta.descuentoPorcentaje || 0,
          datosVenta.descuentoMxn || 0
        );

        if (resultado) {
          setCalculoPrecio(resultado);
          console.log('✅ Precio calculado para venta inmediata:', resultado);
        } else {
          console.warn('⚠️ No se pudo calcular el precio');
          setCalculoPrecio(null);
        }
      } catch (error) {
        console.error('❌ Error calculando precio:', error);
        setCalculoPrecio(null);
      } finally {
        setIsCalculatingPrice(false);
      }
    };

    const timeoutId = setTimeout(recalcularPrecio, 500);
    return () => clearTimeout(timeoutId);
  }, [esVentaInmediata, datosVenta.tipoClienteId, datosVenta.enteroKgs, datosVenta.descuentoPorcentaje, datosVenta.descuentoMxn, watchAllFields.entradas, calcularPrecioInmediato]);

  // Sincronizar peso de cosecha con datos de venta
  useEffect(() => {
    if (esVentaInmediata && watchAllFields.pesoTotalKg) {
      setDatosVenta(prev => ({
        ...prev,
        enteroKgs: watchAllFields.pesoTotalKg || 0
      }));
    }
  }, [esVentaInmediata, watchAllFields.pesoTotalKg]);

  // Calcular peso total automáticamente sumando todas las entradas
  useEffect(() => {
    if (watchAllFields.entradas) {
      const pesoTotal = watchAllFields.entradas.reduce((sum, entrada) => {
        const peso = Number(entrada.pesoKg) || 0;
        console.log("Entrada procesada:", entrada, "Peso extraído:", peso);
        return sum + peso;
      }, 0);

      console.log("🧮 Peso total calculado:", pesoTotal);
      setValue("pesoTotalKg", pesoTotal);
    }
  }, [watchAllFields.entradas, setValue]);

  const onSubmit = async (data: CosechaFormData) => {
    console.log("🔥 onSubmit called with data:", data);
    setIsSubmitting(true);
    try {
      console.log("🔄 Preparando registro...", data);

      // Si es venta inmediata, validar datos ANTES de registrar la cosecha
      if (esVentaInmediata) {
        console.log("🛒 Validando venta inmediata...", datosVenta);

        // Validar datos de venta PRIMERO
        if (!datosVenta.clienteId || !datosVenta.tipoClienteId || !calculoPrecio) {
          throw new Error("Por favor completa todos los campos obligatorios de la venta");
        }

        // Solo validar estatus factura si el tipo de factura no es 'NO'
        const requiereEstatusFactura = datosVenta.tipoFactura !== 'NO';
        if (!datosVenta.metodoPago || !datosVenta.formaPago || !datosVenta.estatusPagoCliente || !datosVenta.tipoFactura || (requiereEstatusFactura && !datosVenta.estatusFactura)) {
          throw new Error("Por favor completa los datos de método de pago y facturación");
        }
      }

      // Solo AHORA registrar la cosecha (después de validar todo)
      await addCosecha(data);
      const cosechaFolio = getNextFolio() - 1;

      // Si es venta inmediata, registrar también la venta
      if (esVentaInmediata) {
        console.log("🛒 Registrando venta inmediata...", datosVenta);

        // Obtener el folio de venta siguiente
        const { data: ventaFolio } = await supabase
          .from('ventas')
          .select('folio')
          .order('folio', { ascending: false })
          .limit(1);

        const nextVentaFolio = ventaFolio && ventaFolio.length > 0 ? ventaFolio[0].folio + 1 : 1;

        // Obtener la talla predominante de la cosecha (primera talla)
        const tallaPredominante = data.entradas[0]?.tallaId || 1;

        // Obtener IDs de los datos seleccionados
        const metodoPagoId = mockData.metodosPago.find(m => m.name === datosVenta.metodoPago)?.id || 1;
        const formaPagoId = mockData.formasPago.find(f => f.name === datosVenta.formaPago)?.id || 1;
        const estatusPagoClienteId = mockData.estatusPagoCliente.find(e => e.name === datosVenta.estatusPagoCliente)?.id || 1;
        const tipoFacturaId = mockData.tiposFactura.find(t => t.name === datosVenta.tipoFactura)?.id || 1;
        const estatusFacturaId = mockData.estatusFactura.find(e => e.name === datosVenta.estatusFactura)?.id || 1;

        // Crear la venta usando los datos calculados
        const ventaData = {
          folio: nextVentaFolio,
          oficina_id: datosVenta.oficinaId ? parseInt(datosVenta.oficinaId) : null,
          responsable_id: parseInt(data.responsable),
          fecha_entrega: data.fechaCosecha.split('T')[0], // Solo la fecha, no la hora
          cliente_id: parseInt(datosVenta.clienteId),
          tipo_cliente_id: parseInt(datosVenta.tipoClienteId),
          tipo_producto_id: 1, // Camarón entero por defecto
          talla_camaron_id: tallaPredominante,
          entero_kgs: calculoPrecio.peso_usado,
          precio_venta: calculoPrecio.precio_unitario,
          descuento_porcentaje: datosVenta.descuentoPorcentaje || 0,
          descuento_mxn: datosVenta.descuentoMxn || 0,
          metodo_pago_id: metodoPagoId,
          forma_pago_id: formaPagoId,
          estatus_pago_cliente_id: estatusPagoClienteId,
          folio_transferencia: datosVenta.folioTransferencia || null,
          tipo_factura_id: tipoFacturaId,
          uso_cfdi: datosVenta.usoCfdi || null,
          estatus_factura_id: estatusFacturaId
        };

        const { error: ventaError } = await supabase
          .from('ventas')
          .insert(ventaData);

        if (ventaError) {
          console.error("❌ Error registrando venta:", ventaError);
          throw new Error(`Error al registrar la venta: ${ventaError.message}`);
        }

        alert(`¡Éxito! Cosecha registrada con folio #${cosechaFolio} y venta registrada con folio #${nextVentaFolio}`);
      } else {
        alert(`Cosecha registrada exitosamente con folio #${cosechaFolio}`);
      }

      // Limpiar formulario
      form.reset({
        responsable: "",
        fechaCosecha: new Date().toISOString().slice(0, 16),
        pesoTotalKg: 0,
        entradas: [{ estanqueId: 1, tallaId: 1, pesoKg: 0.001 }],
        notas: "",
      });

      // Limpiar datos de venta
      setEsVentaInmediata(false);
      setCalculoPrecio(null);
      setDatosVenta({
        clienteId: '',
        tipoClienteId: '',
        oficinaId: '',
        enteroKgs: 0,
        descuentoPorcentaje: 0,
        descuentoMxn: 0,
        metodoPago: '',
        formaPago: '',
        estatusPagoCliente: '',
        folioTransferencia: '',
        tipoFactura: '',
        usoCfdi: '',
        estatusFactura: ''
      });

      if (onCosechaRegistered) {
        setTimeout(() => {
          onCosechaRegistered();
        }, 1000);
      }

    } catch (error) {
      console.error("❌ Error al registrar:", error);
      alert(`Error: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEntrada = () => {
    appendEntrada({ estanqueId: 1, tallaId: 1, pesoKg: 0.001 });
  };

  // Función para agregar cliente (igual que en VentaForm)
  const handleAddClient = async (clientName: string) => {
    try {
      // Intentar insertar en Supabase
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nombre: clientName,
          tipo_cliente_id: 1, // Cliente Final por defecto
          oficina: 'MV', // MV por defecto
          activo: true
        })
        .select('id, nombre')
        .single();

      if (error) {
        console.error('Error agregando cliente:', error);
        // Fallback a agregar localmente si hay error
        const newClient = {
          id: clientes.length > 0 ? Math.max(...clientes.map(c => c.id)) + 1 : 1,
          nombre: clientName
        };
        setClientes(prev => [...prev, newClient]);
      } else {
        // Agregar el cliente exitosamente insertado
        const newClient = {
          id: data.id,
          nombre: data.nombre
        };
        setClientes(prev => [...prev, newClient]);
      }

      setDatosVenta({...datosVenta, clienteId: clientName});
    } catch (error) {
      console.error('Error agregando cliente:', error);
      // Fallback a agregar localmente
      const newClient = {
        id: clientes.length > 0 ? Math.max(...clientes.map(c => c.id)) + 1 : 1,
        nombre: clientName
      };
      setClientes(prev => [...prev, newClient]);
      setDatosVenta({...datosVenta, clienteId: clientName});
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 mb-2">Cargando datos...</div>
          <div className="text-sm text-gray-600">Un momento por favor</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-6xl mx-auto border-gray-200">
        <CardHeader className="bg-white border-b border-gray-100">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Registro de Cosecha
          </CardTitle>
          <p className="text-sm text-gray-600">
            Folio: #{getNextFolio().toString().padStart(4, '0')} - Agua Blanca Seafoods
          </p>
        </CardHeader>

        <CardContent className="p-8 bg-white">
          <form onSubmit={handleSubmit(onSubmit, (errors) => {
            console.log("❌ Form validation errors:", errors);
            alert("Error de validación: " + JSON.stringify(errors, null, 2));
          })} className="space-y-8">
            {/* Datos Generales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Datos Generales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="responsable" className="text-sm font-medium text-gray-700">
                    Responsable *
                  </Label>
                  <Select onValueChange={(value) => setValue("responsable", value)}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Seleccionar responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      {responsables.map((responsable) => (
                        <SelectItem key={responsable.id} value={responsable.nombre}>
                          {responsable.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.responsable && (
                    <p className="text-xs text-red-600">{errors.responsable.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaCosecha" className="text-sm font-medium text-gray-700">
                    Fecha y Hora de Cosecha *
                  </Label>
                  <Input
                    id="fechaCosecha"
                    type="datetime-local"
                    {...register("fechaCosecha")}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                  {errors.fechaCosecha && (
                    <p className="text-xs text-red-600">{errors.fechaCosecha.message}</p>
                  )}
                </div>
              </div>

              {/* Pedido Asociado (Opcional) */}
              <div className="space-y-2">
                <Label htmlFor="pedido" className="text-sm font-medium text-gray-700">
                  Pedido Asociado (Opcional)
                </Label>
                <Controller
                  name="pedidoId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString() || "0"}
                      onValueChange={(value) => field.onChange(value === "0" ? undefined : parseInt(value))}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                        <SelectValue placeholder="Seleccionar pedido (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sin pedido asociado</SelectItem>
                        {pedidosDisponibles.map((pedido) => (
                          <SelectItem key={pedido.id} value={pedido.id.toString()}>
                            #{pedido.id} - {pedido.cliente} | {pedido.producto} {pedido.talla} | {pedido.cantidad_estimada}kg
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-gray-500">
                  Selecciona un pedido si esta cosecha es para satisfacer una orden específica
                </p>
              </div>
            </div>

            {/* Entradas de Cosecha */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Entradas de Cosecha
                </h3>
                <Button
                  type="button"
                  onClick={addEntrada}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Entrada
                </Button>
              </div>

              {entradasFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Estanque {index + 1} *
                    </Label>
                    <Select onValueChange={(value) => setValue(`entradas.${index}.estanqueId`, parseInt(value))}>
                      <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                        <SelectValue placeholder="Seleccionar estanque" />
                      </SelectTrigger>
                      <SelectContent>
                        {estanques.map((estanque) => (
                          <SelectItem key={estanque.id} value={estanque.id.toString()}>
                            {estanque.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Talla *
                    </Label>
                    <Select onValueChange={(value) => setValue(`entradas.${index}.tallaId`, parseInt(value))}>
                      <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                        <SelectValue placeholder="Seleccionar talla" />
                      </SelectTrigger>
                      <SelectContent>
                        {tallas.map((talla) => (
                          <SelectItem key={talla.id} value={talla.id.toString()}>
                            {talla.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Peso (kg) *
                    </Label>
                    <Controller
                      name={`entradas.${index}.pesoKg`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.001"
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            field.onChange(value);
                            console.log("💧 Peso cambiado:", value);

                            // Forzar recálculo del peso total inmediatamente
                            setTimeout(() => {
                              const currentFormData = getValues();
                              console.log("📊 Datos actuales del formulario:", currentFormData);
                              if (currentFormData.entradas) {
                                const newTotal = currentFormData.entradas.reduce((sum, entrada) => {
                                  const peso = Number(entrada.pesoKg) || 0;
                                  console.log("🔢 Sumando peso:", peso);
                                  return sum + peso;
                                }, 0);
                                setValue("pesoTotalKg", newTotal);
                                console.log("🔄 Peso total recalculado a:", newTotal);
                              }
                            }, 50);
                          }}
                          className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                          placeholder="0.000"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2 flex items-end">
                    {entradasFields.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeEntrada(index)}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Peso Total */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Resumen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Peso Total (kg)
                  </Label>
                  <div className="h-10 px-3 py-2 border border-gray-300 bg-gray-50 rounded-md text-sm font-semibold">
                    {formatWeight(watch("pesoTotalKg") || 0)} kg
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notas" className="text-sm font-medium text-gray-700">
                    Notas (opcional)
                  </Label>
                  <Textarea
                    id="notas"
                    {...register("notas")}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    placeholder="Observaciones sobre la cosecha..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Sección de Venta Inmediata */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="venta-inmediata"
                  checked={esVentaInmediata}
                  onCheckedChange={(checked) => setEsVentaInmediata(checked as boolean)}
                />
                <Label htmlFor="venta-inmediata" className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  ¿Esta cosecha es para venta inmediata?
                </Label>
              </div>
              <p className="text-sm text-gray-600 ml-7">
                Selecciona esta opción si el cliente ya está aquí y va a comprar toda la cosecha inmediatamente.
              </p>

              {esVentaInmediata && (
                <div className="ml-7 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-6">
                  <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Datos de la Venta
                  </h4>

                  {/* Datos del Cliente */}
                  <div className="space-y-4">
                    <h5 className="text-md font-medium text-gray-800 border-b border-blue-200 pb-1">Cliente</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Cliente *</Label>
                        <Autocomplete
                          options={clientes.map(c => ({ id: c.id, name: c.nombre }))}
                          value={datosVenta.clienteId || ""}
                          onChange={(value) => setDatosVenta({...datosVenta, clienteId: value})}
                          placeholder="Buscar cliente o escribir nuevo nombre"
                          className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                          onAddNew={() => setIsAddClientDialogOpen(true)}
                          addNewText="Agregar nuevo cliente"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Tipo de Cliente *</Label>
                        <Select onValueChange={(value) => setDatosVenta({...datosVenta, tipoClienteId: value})}>
                          <SelectTrigger className="border-gray-300">
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposCliente.map((tipo) => (
                              <SelectItem key={tipo.id} value={tipo.id.toString()}>
                                {tipo.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Peso y Precio */}
                  <div className="space-y-4">
                    <h5 className="text-md font-medium text-gray-800 border-b border-blue-200 pb-1">Producto</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Peso (kg)</Label>
                        <div className="h-10 px-3 py-2 border border-gray-300 bg-gray-50 rounded-md text-sm">
                          {formatWeight(watch("pesoTotalKg") || 0)} kg
                        </div>
                        <p className="text-xs text-gray-600">Se toma automáticamente de la cosecha</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Precio Sugerido</Label>
                        <div className="h-10 px-3 py-2 border border-gray-300 bg-green-50 rounded-md text-sm font-semibold text-green-800">
                          {isCalculatingPrice ? "Calculando..." :
                           calculoPrecio ? `${formatCurrency(calculoPrecio.precio_unitario)}/kg` :
                           "Selecciona tipo de cliente"}
                        </div>
                        <p className="text-xs text-gray-600">Precio automático según tipo de cliente</p>
                      </div>
                    </div>
                  </div>

                  {/* Descuentos */}
                  <div className="space-y-4">
                    <h5 className="text-md font-medium text-gray-800 border-b border-blue-200 pb-1">Descuentos</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Descuento %</Label>
                        <Input
                          type="number"
                          step="0.01"
                          max="100"
                          value={datosVenta.descuentoPorcentaje}
                          onChange={(e) => setDatosVenta({...datosVenta, descuentoPorcentaje: parseFloat(e.target.value) || 0})}
                          className="border-gray-300"
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Descuento MXN</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={datosVenta.descuentoMxn}
                          onChange={(e) => setDatosVenta({...datosVenta, descuentoMxn: parseFloat(e.target.value) || 0})}
                          className="border-gray-300"
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Total Final</Label>
                        <div className="h-10 px-3 py-2 border border-gray-300 bg-green-50 rounded-md text-sm font-bold text-green-800">
                          {calculoPrecio ? formatCurrency(calculoPrecio.monto_total) : "$0.00"}
                        </div>
                        {calculoPrecio && calculoPrecio.monto_descuentos > 0 && (
                          <p className="text-xs text-gray-600">
                            Descuentos: ${formatCurrency(calculoPrecio.monto_descuentos)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Método de Pago */}
                  <div className="space-y-4">
                    <h5 className="text-md font-medium text-gray-800 border-b border-blue-200 pb-1">Método de Pago</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Método de Pago *</Label>
                        <Select onValueChange={(value) => setDatosVenta({...datosVenta, metodoPago: value})}>
                          <SelectTrigger className="border-gray-300">
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
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Forma de Pago *</Label>
                        <Select onValueChange={(value) => setDatosVenta({...datosVenta, formaPago: value})}>
                          <SelectTrigger className="border-gray-300">
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
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Estatus Pago *</Label>
                        <Select onValueChange={(value) => setDatosVenta({...datosVenta, estatusPagoCliente: value})}>
                          <SelectTrigger className="border-gray-300">
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
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Folio Transferencia (opcional)</Label>
                      <Input
                        value={datosVenta.folioTransferencia}
                        onChange={(e) => setDatosVenta({...datosVenta, folioTransferencia: e.target.value})}
                        className="border-gray-300"
                        placeholder="Número de transferencia o referencia"
                      />
                    </div>
                  </div>

                  {/* Facturación */}
                  <div className="space-y-4">
                    <h5 className="text-md font-medium text-gray-800 border-b border-blue-200 pb-1">Facturación</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Tipo de Factura *</Label>
                        <Select onValueChange={(value) => setDatosVenta({...datosVenta, tipoFactura: value})}>
                          <SelectTrigger className="border-gray-300">
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

                      {datosVenta.tipoFactura !== 'NO' && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Estatus Factura *</Label>
                          <Select onValueChange={(value) => setDatosVenta({...datosVenta, estatusFactura: value})}>
                            <SelectTrigger className="border-gray-300">
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
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Uso CFDI (opcional)</Label>
                      <Input
                        value={datosVenta.usoCfdi}
                        onChange={(e) => setDatosVenta({...datosVenta, usoCfdi: e.target.value})}
                        className="border-gray-300"
                        placeholder="Ej: G03 - Gastos en general"
                      />
                    </div>
                  </div>

                  {/* Oficina */}
                  <div className="space-y-4">
                    <h5 className="text-md font-medium text-gray-800 border-b border-blue-200 pb-1">Información Adicional</h5>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Oficina</Label>
                      <Select onValueChange={(value) => setDatosVenta({...datosVenta, oficinaId: value})}>
                        <SelectTrigger className="border-gray-300">
                          <SelectValue placeholder="Seleccionar oficina" />
                        </SelectTrigger>
                        <SelectContent>
                          {oficinas.map((oficina) => (
                            <SelectItem key={oficina.id} value={oficina.id.toString()}>
                              {oficina.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Resumen Final */}
                  {calculoPrecio && (
                    <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
                      <h6 className="font-semibold text-green-900 mb-2">Resumen de la Venta</h6>
                      <div className="text-sm text-green-800 space-y-1">
                        <p><strong>Peso:</strong> {formatWeight(datosVenta.enteroKgs)} kg</p>
                        <p><strong>Precio base:</strong> {formatCurrency(calculoPrecio.precio_unitario)}/kg</p>
                        <p><strong>Subtotal:</strong> {formatCurrency(calculoPrecio.monto_bruto)}</p>
                        {calculoPrecio.monto_descuentos > 0 && (
                          <p><strong>Descuentos:</strong> -{formatCurrency(calculoPrecio.monto_descuentos)}</p>
                        )}
                        <p className="text-lg font-bold border-t border-green-300 pt-1">
                          <strong>Total Final:</strong> {formatCurrency(calculoPrecio.monto_total)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset({
                  responsable: "",
                  fechaCosecha: new Date().toISOString().slice(0, 16),
                  pesoTotalKg: 0,
                  entradas: [{ estanqueId: 1, tallaId: 1, pesoKg: 0.001 }],
                  notas: "",
                })}
                className="px-8 border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Limpiar
              </Button>
              <Button
                type="submit"
                className="px-8 bg-gray-900 hover:bg-gray-800 text-white"
                disabled={isSubmitting}
                onClick={() => console.log("🚀 Submit button clicked!")}
              >
                {isSubmitting
                  ? (esVentaInmediata ? "Registrando Cosecha + Venta..." : "Registrando Cosecha...")
                  : (esVentaInmediata ? "Registrar Cosecha + Venta" : "Registrar Cosecha")
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AddClientDialog
        isOpen={isAddClientDialogOpen}
        onClose={() => setIsAddClientDialogOpen(false)}
        onAddClient={handleAddClient}
      />
    </div>
  );
}