"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const clientSchema = z.object({
  name: z.string().min(1, "El nombre del cliente es requerido"),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface AddClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClient: (clientName: string) => void;
}

export function AddClientDialog({ isOpen, onClose, onAddClient }: AddClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = form;

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    try {
      // Here you would normally make an API call to save the client
      // For now, we'll just add it to the mock data
      onAddClient(data.name);
      reset();
      onClose();
    } catch (error) {
      console.error("Error adding client:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName" className="text-sm font-medium text-gray-700">
              Nombre del Cliente *
            </Label>
            <Input
              id="clientName"
              {...register("name")}
              placeholder="Nombre del nuevo cliente"
              className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
            />
            {errors.name && (
              <p className="text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {isSubmitting ? "Agregando..." : "Agregar Cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}