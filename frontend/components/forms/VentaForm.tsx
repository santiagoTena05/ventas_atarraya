"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ventaSchema, type VentaFormData } from "@/lib/schemas";
import { mockData } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
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
import { Autocomplete } from "@/components/ui/autocomplete";
import { AddClientDialog } from "./AddClientDialog";
import { useSales } from "@/lib/hooks/useSales";
import { useCosechas } from "@/lib/hooks/useCosechas";
import { usePrecios, type CalculoPrecio } from "@/lib/hooks/usePrecios";

interface VentaFormProps {
  salesHook: ReturnType<typeof useSales>;
  onSaleRegistered?: () => void;
}

export function VentaForm({ salesHook, onSaleRegistered }: VentaFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [oficinas, setOficinas] = useState<{ id: number; name: string }[]>([]);
  const [tiposCliente, setTiposCliente] = useState<{ id: number; name: string }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingOficinas, setIsLoadingOficinas] = useState(true);
  const [isLoadingTiposCliente, setIsLoadingTiposCliente] = useState(true);
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [selectedCosecha, setSelectedCosecha] = useState<unknown>(null);
  const [selectedTallaId, setSelectedTallaId] = useState<number | null>(null);
  const [calculoPrecio, setCalculoPrecio] = useState<CalculoPrecio | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const { getNextFolio } = salesHook;
  const { cosechas, isLoading: isLoadingCosechas, refreshCosechas } = useCosechas();
  const { calcularPrecio } = usePrecios();

  const form = useForm<VentaFormData>({
    resolver: zodResolver(ventaSchema),
    defaultValues: {
      enteroKgs: 0,
      descuentoPorcentaje: 0,
      descuentoMxn: 0,
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;

  // Cargar clientes desde Supabase
  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoadingClients(true);
        console.log('🔄 Cargando clientes desde Supabase...');

        const { data, error } = await supabase
          .from('clientes')
          .select('id, nombre')
          .eq('activo', true)
          .order('nombre');

        if (error) {
          console.error('❌ Error cargando clientes:', error);
          // Fallback a datos mock si hay error
          setClients(mockData.clientes);
          console.log('📋 Usando datos mock como fallback');
        } else {
          // Transformar datos para coincidir con la interfaz esperada
          const transformedClients = data.map(client => ({
            id: client.id,
            name: client.nombre
          }));
          setClients(transformedClients);
          console.log(`✅ Clientes cargados exitosamente: ${transformedClients.length} clientes`);
        }
      } catch (error) {
        console.error('❌ Error cargando clientes:', error);
        // Fallback a datos mock si hay error
        setClients(mockData.clientes);
        console.log('📋 Usando datos mock como fallback');
      } finally {
        setIsLoadingClients(false);
      }
    };

    loadClients();
  }, []);

  // Cargar oficinas desde Supabase
  useEffect(() => {
    const loadOficinas = async () => {
      try {
        setIsLoadingOficinas(true);
        console.log('🔄 Cargando oficinas desde Supabase...');

        const { data, error } = await supabase
          .from('oficinas')
          .select('id, nombre')
          .eq('activa', true)
          .order('nombre');

        if (error) {
          console.error('❌ Error cargando oficinas:', error);
          // Fallback a datos mock si hay error
          setOficinas(mockData.oficinas);
          console.log('📋 Usando datos mock de oficinas como fallback');
        } else {
          // Transformar datos para coincidir con la interfaz esperada
          const transformedOficinas = data.map(oficina => ({
            id: oficina.id,
            name: oficina.nombre
          }));
          setOficinas(transformedOficinas);
          console.log(`✅ Oficinas cargadas exitosamente: ${transformedOficinas.length} oficinas`);
        }
      } catch (error) {
        console.error('❌ Error cargando oficinas:', error);
        // Fallback a datos mock si hay error
        setOficinas(mockData.oficinas);
        console.log('📋 Usando datos mock de oficinas como fallback');
      } finally {
        setIsLoadingOficinas(false);
      }
    };

    loadOficinas();
  }, []);

  // Cargar tipos de cliente desde Supabase
  useEffect(() => {
    const loadTiposCliente = async () => {
      try {
        setIsLoadingTiposCliente(true);
        console.log('🔄 Cargando tipos de cliente desde Supabase...');

        const { data, error } = await supabase
          .from('tipos_cliente')
          .select('id, nombre')
          .eq('activo', true)
          .order('nombre');

        if (error) {
          throw error;
        }

        const transformedTipos = data?.map(tipo => ({
          id: tipo.id,
          name: tipo.nombre,
        })) || [];

        setTiposCliente(transformedTipos);
        console.log(`✅ Tipos de cliente cargados exitosamente: ${transformedTipos.length} tipos`);
      } catch (error) {
        console.error('❌ Error cargando tipos de cliente:', error);
        // Fallback a datos vacíos en caso de error
        setTiposCliente([]);
      } finally {
        setIsLoadingTiposCliente(false);
      }
    };

    loadTiposCliente();
  }, []);

  // Variables movidas abajo donde se usan para el cálculo automático

  // Función helper para buscar IDs por nombre
  const findIdByName = async (table: string, nombre: string, idField = 'id', nameField = 'nombre') => {
    if (!nombre) return null;

    try {
      const { data, error } = await supabase
        .from(table)
        .select(`${idField}, ${nameField}`)
        .eq(nameField, nombre)
        .single();

      if (error || !data) {
        console.warn(`❌ No se encontró ${nombre} en tabla ${table}`);
        return null;
      }

      return data[idField];
    } catch (error) {
      console.warn(`❌ Error buscando ${nombre} en ${table}:`, error);
      return null;
    }
  };

  // Función para obtener la talla predominante de una cosecha desde cosechas_tallas
  const obtenerTallaDeCosecha = async (cosechaId: number) => {
    try {
      console.log(`🔍 Buscando tallas para cosecha ${cosechaId}...`);

      // Consultar la tabla cosecha_tallas para obtener todas las tallas de esta cosecha
      const { data: tallas, error } = await supabase
        .from('cosecha_tallas')
        .select('talla_camaron_id, peso_talla_kg, porcentaje_talla')
        .eq('cosecha_id', cosechaId)
        .order('peso_talla_kg', { ascending: false }); // Ordenar por peso descendente

      if (!error && tallas && tallas.length > 0) {
        // Tomar la talla con mayor peso
        const tallaPredominante = tallas[0];
        setSelectedTallaId(tallaPredominante.talla_camaron_id);
        console.log(`✅ Talla predominante obtenida de cosecha ${cosechaId}: ID ${tallaPredominante.talla_camaron_id} (${tallaPredominante.peso_talla_kg}kg - ${tallaPredominante.porcentaje_talla}%)`);
      } else {
        console.warn(`⚠️ No se encontraron tallas para cosecha ${cosechaId}:`, error);
        setSelectedTallaId(1); // Default a la primera talla
      }
    } catch (error) {
      console.error('❌ Error obteniendo talla de cosecha:', error);
      setSelectedTallaId(1); // Default a la primera talla
    }
  };

  // Watch para recalcular precio automáticamente
  const cosechaId = watch('cosechaId');
  const tipoCliente = watch('tipoCliente');
  const enteroKgs = watch('enteroKgs');
  const descuentoPorcentaje = watch('descuentoPorcentaje');
  const descuentoMxn = watch('descuentoMxn');

  // Efecto para obtener talla cuando cambie la cosecha
  useEffect(() => {
    if (cosechaId) {
      obtenerTallaDeCosecha(cosechaId);
    } else {
      setSelectedTallaId(null);
    }
  }, [cosechaId]);

  useEffect(() => {
    const recalcularPrecio = async () => {
      // Solo calcular si tenemos todos los datos necesarios
      if (!cosechaId || !tipoCliente || !enteroKgs || enteroKgs <= 0) {
        setCalculoPrecio(null);
        return;
      }

      try {
        setIsCalculatingPrice(true);
        console.log('💰 Calculando precio automático...', {
          cosechaId,
          tipoCliente,
          enteroKgs,
          descuentoPorcentaje: descuentoPorcentaje || 0,
          descuentoMxn: descuentoMxn || 0
        });

        const resultado = await calcularPrecio(
          cosechaId,
          tipoCliente,
          enteroKgs,
          descuentoPorcentaje || 0,
          descuentoMxn || 0
        );

        if (resultado) {
          setCalculoPrecio(resultado);
          console.log('✅ Precio calculado:', resultado);
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

    // Debounce para evitar cálculos excesivos
    const timeoutId = setTimeout(recalcularPrecio, 500);
    return () => clearTimeout(timeoutId);
  }, [cosechaId, tipoCliente, enteroKgs, descuentoPorcentaje, descuentoMxn, calcularPrecio]);

  const onSubmit = async (data: VentaFormData) => {
    setIsSubmitting(true);
    try {
      const nextFolio = getNextFolio();

      // Validar que tenemos el cálculo de precio
      if (!calculoPrecio) {
        alert("Error: No se pudo calcular el precio automáticamente. Verifica que hayas seleccionado todos los campos necesarios.");
        setIsSubmitting(false);
        return;
      }

      console.log("🔄 Enviando venta a Supabase...", data);
      console.log("💰 Usando precio calculado:", calculoPrecio);

      // Buscar IDs para las relaciones
      const [
        oficinaId,
        responsableId,
        regionMercadoId,
        clienteId,
        tipoClienteId,
        tipoProductoId,
        metodoPagoId,
        formaPagoId,
        estatusPagoClienteId,
        estatusDepositoId,
        tipoFacturaId,
        estatusFacturaId
      ] = await Promise.all([
        findIdByName('oficinas', data.oficina),
        findIdByName('responsables', data.responsable),
        findIdByName('regiones_mercado', data.regionMercado),
        findIdByName('clientes', data.cliente),
        findIdByName('tipos_cliente', data.tipoCliente),
        findIdByName('tipos_producto', data.tipoProducto),
        findIdByName('metodos_pago', data.metodoPago),
        findIdByName('formas_pago', data.formaPago),
        findIdByName('estatus_pago', data.estatusPagoCliente),
        findIdByName('estatus_pago', data.estatusDeposito),
        findIdByName('tipos_factura', data.tipoFactura),
        findIdByName('estatus_factura', data.estatusFactura)
      ]);

      console.log("🔍 IDs encontrados:", {
        oficinaId, responsableId, regionMercadoId, clienteId, tipoClienteId,
        tipoProductoId, metodoPagoId, formaPagoId, estatusPagoClienteId,
        estatusDepositoId, tipoFacturaId, estatusFacturaId
      });

      // Guardar en Supabase
      const { data: newVenta, error } = await supabase
        .from('ventas')
        .insert({
          folio: nextFolio,
          // Datos administrativos
          oficina_id: oficinaId,
          responsable_id: responsableId,
          region_mercado_id: regionMercadoId,

          // Datos de cosecha
          cosecha_id: data.cosechaId,
          fecha_entrega: data.fechaEntrega,

          // Datos del cliente
          cliente_id: clienteId,
          tipo_cliente_id: tipoClienteId,
          no_orden_atarraya: data.noOrdenAtarraya || null,

          // Datos del producto
          tipo_producto_id: tipoProductoId,
          talla_camaron_id: selectedTallaId,
          entero_kgs: data.enteroKgs,
          precio_venta: calculoPrecio.precio_unitario,
          // monto_venta y total_orden se calculan automáticamente en la base de datos

          // Descuentos
          descuento_porcentaje: data.descuentoPorcentaje || 0,
          descuento_mxn: data.descuentoMxn || 0,

          // Método de pago
          metodo_pago_id: metodoPagoId,
          forma_pago_id: formaPagoId,
          estatus_pago_cliente_id: estatusPagoClienteId,
          estatus_deposito_id: estatusDepositoId,
          folio_transferencia: data.folioTransferencia || null,

          // Facturación
          tipo_factura_id: tipoFacturaId,
          uso_cfdi: data.usoCfdi || null,
          estatus_factura_id: estatusFacturaId,
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error de Supabase:", error);
        throw error;
      }

      console.log("✅ Venta guardada en Supabase:", newVenta);

      // Refrescar datos desde Supabase para ver la nueva venta inmediatamente
      await salesHook.refreshSales();

      // Refrescar inventario de cosechas para actualizar peso disponible
      await refreshCosechas();

      alert(`Venta registrada exitosamente con folio #${nextFolio.toString().padStart(4, '0')}`);

      // Limpiar formulario
      form.reset({
        enteroKgs: 0,
        descuentoPorcentaje: 0,
        descuentoMxn: 0,
      });
      setSelectedCosecha(null);
      setSelectedTallaId(null);
      setCalculoPrecio(null);

      // Opcional: cambiar a vista de tabla automáticamente
      if (onSaleRegistered) {
        setTimeout(() => {
          onSaleRegistered();
        }, 1000);
      }
    } catch (error) {
      console.error("❌ Error al registrar venta:", error);
      alert(`Error al registrar la venta: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    form.reset();
  };

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
          id: clients.length > 0 ? Math.max(...clients.map(c => c.id)) + 1 : 1,
          name: clientName
        };
        setClients(prev => [...prev, newClient]);
      } else {
        // Agregar el cliente exitosamente insertado
        const newClient = {
          id: data.id,
          name: data.nombre
        };
        setClients(prev => [...prev, newClient]);
      }

      setValue("cliente", clientName);
    } catch (error) {
      console.error('Error agregando cliente:', error);
      // Fallback a agregar localmente
      const newClient = {
        id: clients.length > 0 ? Math.max(...clients.map(c => c.id)) + 1 : 1,
        name: clientName
      };
      setClients(prev => [...prev, newClient]);
      setValue("cliente", clientName);
    }
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
                      <SelectValue placeholder={isLoadingOficinas ? "Cargando oficinas..." : "Seleccionar oficina"} />
                    </SelectTrigger>
                    <SelectContent>
                      {oficinas.map((oficina) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cosecha" className="text-sm font-medium text-gray-700">
                    Cosecha *
                  </Label>
                  <Select onValueChange={(value) => {
                    const cosechaId = parseInt(value);
                    const cosecha = cosechas.find(c => c.id === cosechaId);
                    setValue("cosechaId", cosechaId);
                    setSelectedCosecha(cosecha);
                    console.log("🌾 Cosecha seleccionada:", cosecha);
                  }}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder={isLoadingCosechas ? "Cargando cosechas..." : "Seleccionar cosecha"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cosechas.map((cosecha) => {
                        const pesoDisponible = cosecha.pesoDisponibleKg || cosecha.pesoTotalKg;
                        const estadoColor =
                          (cosecha.estadoInventario === 'agotado') ? 'text-red-600' :
                          (cosecha.estadoInventario === 'parcial') ? 'text-yellow-600' : 'text-green-600';
                        return (
                          <SelectItem
                            key={cosecha.id}
                            value={cosecha.id.toString()}
                            disabled={pesoDisponible <= 0}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span>
                                #{cosecha.folio.toString().padStart(4, '0')} - {cosecha.responsable}
                              </span>
                              <span className={`text-xs font-medium ${estadoColor}`}>
                                {pesoDisponible.toFixed(1)}kg disponibles
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {errors.cosechaId && (
                    <p className="text-xs text-red-600">{errors.cosechaId.message}</p>
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

            {/* Datos del Producto */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Datos del Producto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <Label htmlFor="enteroKgs" className="text-sm font-medium text-gray-700">
                    Entero | kgs *
                    {selectedCosecha && (
                      <span className="text-xs text-gray-500 ml-1">
                        (Máx: {(selectedCosecha.pesoDisponibleKg || selectedCosecha.pesoTotalKg).toFixed(1)}kg disponibles)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="enteroKgs"
                    type="number"
                    step="0.001"
                    max={selectedCosecha?.pesoDisponibleKg || selectedCosecha?.pesoTotalKg || undefined}
                    {...register("enteroKgs", {
                      valueAsNumber: true,
                      max: {
                        value: selectedCosecha?.pesoDisponibleKg || selectedCosecha?.pesoTotalKg || 999999,
                        message: `No puede exceder ${(selectedCosecha?.pesoDisponibleKg || selectedCosecha?.pesoTotalKg)?.toFixed(1) || 0}kg (peso disponible en inventario)`
                      }
                    })}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    placeholder="0.000"
                  />
                  {errors.enteroKgs && (
                    <p className="text-xs text-red-600">{errors.enteroKgs.message}</p>
                  )}
                  {selectedCosecha && (
                    <div className="text-xs space-y-1">
                      <p className="text-blue-600">
                        💡 Cosecha #{selectedCosecha.folio}: {(selectedCosecha.pesoDisponibleKg || selectedCosecha.pesoTotalKg).toFixed(1)}kg disponibles
                      </p>
                      {selectedCosecha.pesoVendidoKg > 0 && (
                        <p className="text-gray-500">
                          📊 Total: {selectedCosecha.pesoTotalKg.toFixed(1)}kg | Vendido: {selectedCosecha.pesoVendidoKg.toFixed(1)}kg ({selectedCosecha.porcentajeVendido}%)
                        </p>
                      )}
                      {selectedCosecha.estadoInventario === 'agotado' && (
                        <p className="text-red-600 font-medium">
                          ⚠️ Esta cosecha está agotada
                        </p>
                      )}
                      {selectedCosecha.estadoInventario === 'parcial' && (
                        <p className="text-yellow-600">
                          ⚡ Inventario parcial - quedan {(selectedCosecha.pesoDisponibleKg || 0).toFixed(1)}kg
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Precio Calculado Automáticamente */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Precio Unitario (Automático)
                  </Label>
                  <div className="h-10 px-3 py-2 border border-gray-300 bg-blue-50 rounded-md text-sm font-semibold flex items-center justify-between">
                    <span>
                      {isCalculatingPrice ? "Calculando..." :
                       calculoPrecio ? `$${calculoPrecio.precio_unitario.toFixed(2)}/kg` :
                       "Selecciona cosecha y tipo cliente"}
                    </span>
                    {calculoPrecio && (
                      <span className="text-xs text-blue-600 capitalize">
                        ({calculoPrecio.tipo_precio_aplicado})
                      </span>
                    )}
                  </div>
                  {calculoPrecio && (
                    <p className="text-xs text-blue-600">
                      💡 Talla: {calculoPrecio.talla_detectada} | Tipo: {calculoPrecio.tipo_precio_aplicado}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Monto Bruto
                  </Label>
                  <div className="h-10 px-3 py-2 border border-gray-300 bg-gray-50 rounded-md text-sm font-semibold">
                    {calculoPrecio ? `$${calculoPrecio.monto_bruto.toFixed(2)}` : "$0.00"}
                  </div>
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
                  <Autocomplete
                    options={clients}
                    value={watch("cliente") || ""}
                    onChange={(value) => setValue("cliente", value)}
                    placeholder={isLoadingClients ? "Cargando clientes..." : "Buscar cliente o escribir nuevo nombre"}
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    onAddNew={() => setIsAddClientDialogOpen(true)}
                    addNewText="Agregar nuevo cliente"
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
                      {isLoadingTiposCliente ? (
                        <SelectItem value="loading" disabled>
                          Cargando tipos de cliente...
                        </SelectItem>
                      ) : tiposCliente.length > 0 ? (
                        tiposCliente.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.name}>
                            {tipo.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-data" disabled>
                          No hay tipos de cliente disponibles
                        </SelectItem>
                      )}
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
                    Total Final | mxn
                  </Label>
                  <div className="h-10 px-3 py-2 border border-gray-300 bg-green-50 rounded-md text-sm font-bold text-green-800">
                    {calculoPrecio ? `$${calculoPrecio.monto_total.toFixed(2)}` : "$0.00"}
                  </div>
                  {calculoPrecio && calculoPrecio.monto_descuentos > 0 && (
                    <p className="text-xs text-gray-600">
                      💰 Descuentos aplicados: $${calculoPrecio.monto_descuentos.toFixed(2)}
                    </p>
                  )}
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

      <AddClientDialog
        isOpen={isAddClientDialogOpen}
        onClose={() => setIsAddClientDialogOpen(false)}
        onAddClient={handleAddClient}
      />
    </div>
  );
}