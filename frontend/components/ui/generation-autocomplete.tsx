"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { ChevronDown, Plus } from "lucide-react";
import { useGeneraciones } from "@/lib/hooks/useGeneraciones";

interface GenerationAutocompleteProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function GenerationAutocomplete({
  value = "",
  onChange,
  placeholder = "Buscar generación...",
  className = ""
}: GenerationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { generaciones, codigosGeneraciones, crearGeneracion, existeGeneracion } = useGeneraciones();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filteredOptions = codigosGeneraciones.filter(codigo =>
    codigo.toLowerCase().includes(inputValue.toLowerCase())
  );

  const shouldShowCreateOption = inputValue.trim() && !existeGeneracion(inputValue.trim());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleOptionSelect = (codigo: string) => {
    setInputValue(codigo);
    onChange(codigo);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleCreateNew = async () => {
    if (!inputValue.trim() || isCreating) return;

    try {
      setIsCreating(true);
      const nuevaGeneracion = {
        codigo: inputValue.trim(),
        estado: 'activa' as const
      };

      await crearGeneracion(nuevaGeneracion);
      setInputValue(inputValue.trim());
      onChange(inputValue.trim());
      setIsOpen(false);
    } catch (error) {
      console.error('Error creando generación:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={`pr-8 ${className}`}
        />
        <ChevronDown
          className={`absolute right-2 top-1/2 h-4 w-4 transform -translate-y-1/2 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.length > 0 ? (
            <>
              {filteredOptions.map((codigo) => (
                <button
                  key={codigo}
                  onClick={() => handleOptionSelect(codigo)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
                >
                  {codigo}
                </button>
              ))}
              {shouldShowCreateOption && (
                <div className="border-t border-gray-200">
                  <button
                    onClick={handleCreateNew}
                    disabled={isCreating}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm text-blue-600 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {isCreating ? 'Creando...' : `Crear generación "${inputValue}"`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              {shouldShowCreateOption ? (
                <button
                  onClick={handleCreateNew}
                  disabled={isCreating}
                  className="block w-full mt-2 px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-blue-600 flex items-center gap-2 rounded disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {isCreating ? 'Creando...' : `Crear generación "${inputValue}"`}
                </button>
              ) : (
                'No se encontraron generaciones'
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}