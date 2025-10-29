"use client";

import * as React from "react";
import { Check } from "lucide-react";

interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, checked, onCheckedChange, disabled, className, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={`
            w-4 h-4 border border-gray-300 rounded flex items-center justify-center cursor-pointer
            ${checked ? 'bg-gray-900 border-gray-900' : 'bg-white'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
            ${className}
          `}
          onClick={() => !disabled && onCheckedChange?.(!checked)}
        >
          {checked && (
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };