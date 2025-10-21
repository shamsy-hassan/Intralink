export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class FormValidator {
  static validateField(value: any, rules: ValidationRule): ValidationResult {
    const errors: string[] = [];

    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors.push('This field is required');
    }

    // Skip other validations if value is empty (unless required)
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return { isValid: errors.length === 0, errors };
    }

    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Must be at least ${rules.minLength} characters long`);
    }

    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Must be no more than ${rules.maxLength} characters long`);
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push('Invalid format');
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        errors.push(customError);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  static validateForm(data: Record<string, any>, rules: Record<string, ValidationRule>): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};

    for (const [field, fieldRules] of Object.entries(rules)) {
      results[field] = this.validateField(data[field], fieldRules);
    }

    return results;
  }

  static isFormValid(validationResults: Record<string, ValidationResult>): boolean {
    return Object.values(validationResults).every(result => result.isValid);
  }
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
};

// React hook for form validation
import { useState, useCallback } from 'react';

export interface UseFormValidationProps {
  initialData: Record<string, any>;
  validationRules: Record<string, ValidationRule>;
}

export function useFormValidation({ initialData, validationRules }: UseFormValidationProps) {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((fieldName: string, value: any) => {
    const fieldRules = validationRules[fieldName];
    if (!fieldRules) return { isValid: true, errors: [] };

    return FormValidator.validateField(value, fieldRules);
  }, [validationRules]);

  const updateField = useCallback((fieldName: string, value: any) => {
    setData(prev => ({ ...prev, [fieldName]: value }));
    
    // Validate on change if field has been touched
    if (touched[fieldName]) {
      const validation = validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: validation.errors }));
    }
  }, [touched, validateField]);

  const touchField = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // Validate when field is touched
    const validation = validateField(fieldName, data[fieldName]);
    setErrors(prev => ({ ...prev, [fieldName]: validation.errors }));
  }, [data, validateField]);

  const validateAll = useCallback(() => {
    const allValidations = FormValidator.validateForm(data, validationRules);
    const allErrors: Record<string, string[]> = {};
    
    for (const [field, validation] of Object.entries(allValidations)) {
      allErrors[field] = validation.errors;
    }
    
    setErrors(allErrors);
    setTouched(Object.keys(validationRules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    
    return FormValidator.isFormValid(allValidations);
  }, [data, validationRules]);

  const isValid = FormValidator.isFormValid(
    Object.fromEntries(
      Object.keys(validationRules).map(field => [
        field,
        validateField(field, data[field])
      ])
    )
  );

  const reset = useCallback(() => {
    setData(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  return {
    data,
    errors,
    touched,
    isValid,
    updateField,
    touchField,
    validateAll,
    reset
  };
}