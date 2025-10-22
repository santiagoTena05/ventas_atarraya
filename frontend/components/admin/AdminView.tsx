"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Users,
  Building2,
  MapPin,
  UserCheck,
  Ruler,
  Package
} from "lucide-react";

import { AdminPreciosView } from "./AdminPreciosView";
import { AdminResponsablesView } from "./AdminResponsablesView";
import { AdminOficinasView } from "./AdminOficinasView";
import { AdminRegionesView } from "./AdminRegionesView";
import { AdminClientesView } from "./AdminClientesView";
import { AdminTallasView } from "./AdminTallasView";

type AdminSection = 'precios' | 'responsables' | 'oficinas' | 'regiones' | 'clientes' | 'tallas';

const adminSections = [
  {
    id: 'tallas' as AdminSection,
    name: 'Tallas y Precios',
    icon: Ruler,
    description: 'Gestionar tallas de camarón y sus precios por tipo de cliente',
    color: 'bg-blue-600 hover:bg-blue-700'
  },
  {
    id: 'clientes' as AdminSection,
    name: 'Clientes',
    icon: Users,
    description: 'Administrar información de clientes y tipos de cliente',
    color: 'bg-green-600 hover:bg-green-700'
  },
  {
    id: 'responsables' as AdminSection,
    name: 'Responsables',
    icon: UserCheck,
    description: 'Gestionar responsables de ventas y cosechas',
    color: 'bg-purple-600 hover:bg-purple-700'
  },
  {
    id: 'oficinas' as AdminSection,
    name: 'Oficinas',
    icon: Building2,
    description: 'Administrar oficinas y sucursales',
    color: 'bg-orange-600 hover:bg-orange-700'
  },
  {
    id: 'regiones' as AdminSection,
    name: 'Regiones de Mercado',
    icon: MapPin,
    description: 'Gestionar regiones y zonas de mercado',
    color: 'bg-indigo-600 hover:bg-indigo-700'
  }
];

export function AdminView() {
  const [activeSection, setActiveSection] = useState<AdminSection | null>(null);

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'precios':
        return <AdminPreciosView />;
      case 'tallas':
        return <AdminTallasView />;
      case 'responsables':
        return <AdminResponsablesView />;
      case 'oficinas':
        return <AdminOficinasView />;
      case 'regiones':
        return <AdminRegionesView />;
      case 'clientes':
        return <AdminClientesView />;
      default:
        return null;
    }
  };

  if (activeSection) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {adminSections.find(s => s.id === activeSection)?.name}
            </h1>
            <p className="text-sm text-gray-600">
              {adminSections.find(s => s.id === activeSection)?.description}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setActiveSection(null)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            ← Volver al Panel Principal
          </Button>
        </div>

        <div className="border-t pt-6">
          {renderActiveSection()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Encabezado */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-gray-600 mt-2">
          Gestiona la configuración del sistema, catálogos y datos maestros
        </p>
      </div>

      {/* Grid de secciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {adminSections.map((section) => {
          const IconComponent = section.icon;
          return (
            <Card
              key={section.id}
              className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-gray-300"
              onClick={() => setActiveSection(section.id)}
            >
              <CardHeader className="text-center">
                <div className={`w-16 h-16 rounded-full ${section.color} flex items-center justify-center mx-auto mb-3`}>
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {section.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 text-center mb-4">
                  {section.description}
                </p>
                <Button
                  className={`w-full ${section.color} text-white`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSection(section.id);
                  }}
                >
                  Administrar
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Información adicional */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <Package className="h-6 w-6 text-teal-600 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Sistema de Gestión Integrado
            </h3>
            <p className="text-sm text-gray-600">
              Este panel de administración te permite gestionar todos los aspectos del sistema de ventas y cosechas.
              Los cambios realizados aquí se reflejan inmediatamente en el sistema operativo y afectan directamente
              las operaciones de registro de ventas, cálculo de precios y generación de reportes.
            </p>
            <div className="mt-3 text-xs text-gray-500">
              <strong>Nota:</strong> Todos los cambios se guardan automáticamente en la base de datos.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}