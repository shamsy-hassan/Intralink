import React from 'react';
import type { ReactNode } from 'react';

interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  placeholder?: string;
  required?: boolean;
  errors?: string[];
  className?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  children?: ReactNode;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  required = false,
  errors = [],
  className = '',
  disabled = false,
  multiline = false,
  rows = 3,
  children
}) => {
  const hasErrors = errors.length > 0;
  
  const inputClassName = `
    w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-colors
    ${hasErrors 
      ? 'border-red-300 focus:ring-red-500' 
      : 'border-gray-300 focus:ring-purple-500'
    }
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    ${className}
  `.trim();

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <InputComponent
        type={multiline ? undefined : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        rows={multiline ? rows : undefined}
        className={inputClassName}
        aria-invalid={hasErrors}
        aria-describedby={hasErrors ? `${label}-error` : undefined}
      />
      
      {children}
      
      {hasErrors && (
        <div id={`${label}-error`} className="space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  errors?: string[];
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  value,
  onChange,
  onBlur,
  options,
  required = false,
  errors = [],
  className = '',
  disabled = false,
  placeholder = 'Select an option...'
}) => {
  const hasErrors = errors.length > 0;
  
  const selectClassName = `
    w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-colors
    ${hasErrors 
      ? 'border-red-300 focus:ring-red-500' 
      : 'border-gray-300 focus:ring-purple-500'
    }
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    ${className}
  `.trim();

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={selectClassName}
        aria-invalid={hasErrors}
        aria-describedby={hasErrors ? `${label}-error` : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {hasErrors && (
        <div id={`${label}-error`} className="space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};