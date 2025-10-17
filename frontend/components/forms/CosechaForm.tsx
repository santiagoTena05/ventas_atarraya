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
import { Plus, Trash2 } from "lucide-react";
import { useCosechas } from "@/lib/hooks/useCosechas";

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
  const [isLoadingData, setIsLoadingData] = useState(true);

  const { addCosecha, getNextFolio } = useCosechas();

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

        // Cargar responsables
        const { data: responsablesData } = await supabase
          .from('responsables')
          .select('id, nombre')
          .eq('activo', true)
          .order('nombre');

        if (responsablesData) {
          setResponsables(responsablesData);
        }

        // Cargar estanques
        const { data: estanquesData } = await supabase
          .from('estanques')
          .select('id, nombre')
          .eq('activo', true)
          .order('nombre');

        if (estanquesData) {
          setEstanques(estanquesData);
        }

        // Cargar tallas
        const { data: tallasData } = await supabase
          .from('tallas_camaron')
          .select('id, nombre')
          .order('nombre');

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

  // Calcular peso total automáticamente sumando todas las entradas
  const watchAllFields = watch();

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
      console.log("🔄 Registrando cosecha...", data);

      await addCosecha(data);

      alert(`Cosecha registrada exitosamente con folio #${getNextFolio() - 1}`);

      // Limpiar formulario
      form.reset({
        responsable: "",
        fechaCosecha: new Date().toISOString().slice(0, 16),
        pesoTotalKg: 0,
        entradas: [{ estanqueId: 1, tallaId: 1, pesoKg: 0.001 }],
        notas: "",
      });

      if (onCosechaRegistered) {
        setTimeout(() => {
          onCosechaRegistered();
        }, 1000);
      }

    } catch (error) {
      console.error("❌ Error al registrar cosecha:", error);
      alert(`Error al registrar la cosecha: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEntrada = () => {
    appendEntrada({ estanqueId: 1, tallaId: 1, pesoKg: 0.001 });
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
                    {watch("pesoTotalKg")?.toFixed(3) || "0.000"} kg
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
                {isSubmitting ? "Registrando..." : "Registrar Cosecha"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}