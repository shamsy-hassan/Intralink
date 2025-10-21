import React, { useState } from 'react';
import { FormInput, FormSelect } from '../components/common/FormComponents';
import { useFormValidation } from '../lib/validation';
import type { ValidationRule } from '../lib/validation';
import { useToastHelpers } from '../components/common/Toast';
import { useLoading, LoadingButton } from '../components/common/LoadingSystem';
import { ErrorHandler } from '../lib/errorHandler';

const SystemsTest: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');

  const { showSuccess, showError } = useToastHelpers();
  const { setLoading } = useLoading();

  const validationRules: Record<string, ValidationRule> = {
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      custom: (value) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address';
        }
        return null;
      }
    },
    password: {
      required: true,
      minLength: 8,
      maxLength: 50
    },
    role: {
      required: true
    },
    message: {
      required: true,
      minLength: 10,
      maxLength: 500
    }
  };

  const {
    errors: formErrors,
    touched,
    isValid: isFormValid,
    updateField,
    touchField,
    validateAll,
    reset: resetForm
  } = useFormValidation({
    initialData: { email, password, role, message },
    validationRules
  });

  const handleTestError = async () => {
    try {
      // Simulate an API error
      throw new Error('Test network error');
    } catch (error) {
      const appError = ErrorHandler.handle(error);
      showError('Test Error', appError.message);
    }
  };

  const handleTestLoading = async () => {
    setLoading('test', true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading('test', false);
    showSuccess('Loading test completed!');
  };

  const handleTestValidation = () => {
    const isValid = validateAll();
    if (isValid) {
      showSuccess('Form is valid!');
    } else {
      showError('Form has validation errors');
    }
  };

  const handleTestSuccess = () => {
    resetForm();
    setEmail('');
    setPassword('');
    setRole('');
    setMessage('');
    showSuccess('Form reset successfully!');
  };

  const roleOptions = [
    { value: 'admin', label: 'Administrator' },
    { value: 'hr', label: 'HR Manager' },
    { value: 'staff', label: 'Staff Member' }
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Systems Test</h2>
      
      <div className="space-y-6">
        <FormInput
          label="Email Address"
          value={email}
          onChange={(value) => {
            setEmail(value);
            updateField('email', value);
          }}
          onBlur={() => touchField('email')}
          placeholder="Enter your email..."
          required={true}
          errors={touched.email ? formErrors.email : []}
          type="email"
        />

        <FormInput
          label="Password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            updateField('password', value);
          }}
          onBlur={() => touchField('password')}
          placeholder="Enter your password..."
          required={true}
          errors={touched.password ? formErrors.password : []}
          type="password"
        />

        <FormSelect
          label="Role"
          value={role}
          onChange={(value) => {
            setRole(value);
            updateField('role', value);
          }}
          onBlur={() => touchField('role')}
          options={roleOptions}
          placeholder="Select your role..."
          required={true}
          errors={touched.role ? formErrors.role : []}
        />

        <FormInput
          label="Message"
          value={message}
          onChange={(value) => {
            setMessage(value);
            updateField('message', value);
          }}
          onBlur={() => touchField('message')}
          placeholder="Enter a test message..."
          required={true}
          errors={touched.message ? formErrors.message : []}
          multiline={true}
          rows={3}
        />

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleTestError}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Test Error Toast
          </button>

          <LoadingButton
            loading={false}
            onClick={handleTestLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Test Loading
          </LoadingButton>

          <button
            onClick={handleTestValidation}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Test Validation
          </button>

          <button
            onClick={handleTestSuccess}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Test Success & Reset
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Form Status</h3>
          <div className="space-y-1 text-sm">
            <p><strong>Valid:</strong> {isFormValid ? 'Yes' : 'No'}</p>
            <p><strong>Touched Fields:</strong> {Object.keys(touched).filter(key => touched[key]).join(', ') || 'None'}</p>
            <p><strong>Errors:</strong> {Object.keys(formErrors).filter(key => formErrors[key].length > 0).join(', ') || 'None'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemsTest;