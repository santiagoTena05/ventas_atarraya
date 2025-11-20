"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Wrench, Rocket } from 'lucide-react';
import Link from 'next/link';

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/inventario-vivo">
            <Button variant="outline" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-green-600" />
            Planner de Producción
          </h1>
        </div>

        {/* Coming Soon Card */}
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur">
            <CardContent className="p-12 text-center">
              {/* Animated GIF/Icon */}
              <div className="mb-8 relative">
                <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mb-6 animate-pulse">
                  <Rocket className="h-16 w-16 text-white animate-bounce" />
                </div>

                {/* Fun animated elements */}
                <div className="absolute -top-4 -right-4">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full animate-ping"></div>
                </div>
                <div className="absolute -bottom-2 -left-2">
                  <Wrench className="h-6 w-6 text-gray-400 animate-spin" />
                </div>
              </div>

              {/* Main Message */}
              <h2 className="text-4xl font-bold text-gray-900 mb-4 animate-fade-in">
                🚧 ¡Estamos cocinando algo épico! 🚧
              </h2>

              <p className="text-xl text-gray-600 mb-6 max-w-2xl mx-auto leading-relaxed">
                Nuestro equipo de desarrollo está trabajando en el sistema de planificación más
                avanzado para optimizar tu producción acuícola.
              </p>

              {/* Features Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-3xl mx-auto">
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <Calendar className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-green-800 mb-2">Planner</h3>
                  <p className="text-sm text-green-600">Planificación automática de muestreos y cosechas</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <Rocket className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-blue-800 mb-2">Playground</h3>
                  <p className="text-sm text-blue-600">Planeación</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <Wrench className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-purple-800 mb-2">Optimización</h3>
                  <p className="text-sm text-purple-600">Maximiza eficiencia y rentabilidad</p>
                </div>
              </div>

              {/* Status */}
              <div className="bg-gradient-to-r from-green-100 to-blue-100 p-6 rounded-xl mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
                <p className="text-lg font-medium text-gray-700">
                  <span className="text-green-600 font-bold">En desarrollo activo</span>
                  {' '} • Estimado: Próximas semanas
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Mientras tanto, puedes seguir usando todas las funciones de Inventario Vivo
                </p>
              </div>

              {/* CTA Button */}
              <Link href="/inventario-vivo">
                <Button className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Volver a Inventario Vivo
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating animation styles */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
      `}</style>
    </div>
  );
}