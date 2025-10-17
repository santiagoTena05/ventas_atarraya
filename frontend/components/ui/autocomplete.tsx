"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { ChevronDown, Plus } from "lucide-react";

interface AutocompleteOption {
  id: number;
  name: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onAddNew?: () => void;
  addNewText?: string;
}

export function Autocomplete({
  options,
  value = "",
  onChange,
  placeholder = "Buscar...",
  className = "",
  onAddNew,
  addNewText = "Agregar nuevo cliente"
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const filtered = options.filter(option =>
      option.name.toLowerCase().includes(inputValue.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [options, inputValue]);

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

  const handleOptionSelect = (option: AutocompleteOption) => {
    setInputValue(option.name);
    onChange(option.name);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleAddNew = () => {
    setIsOpen(false);
    if (onAddNew) {
      onAddNew();
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
              {filteredOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
                >
                  {option.name}
                </button>
              ))}
              {onAddNew && (
                <div className="border-t border-gray-200">
                  <button
                    onClick={handleAddNew}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm text-blue-600 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {addNewText}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No se encontraron clientes
              {onAddNew && (
                <button
                  onClick={handleAddNew}
                  className="block w-full mt-2 px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-blue-600 flex items-center gap-2 rounded"
                >
                  <Plus className="h-4 w-4" />
                  {addNewText}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}