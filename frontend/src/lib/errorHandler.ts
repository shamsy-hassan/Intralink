// Error handling utilities
export interface AppError {
  message: string;
  type: 'network' | 'auth' | 'validation' | 'server' | 'unknown';
  details?: any;
  timestamp: Date;
}

export class ErrorHandler {
  static handle(error: any): AppError {
    const timestamp = new Date();
    
    if (error.response) {
      // HTTP error responses
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 401:
          return {
            message: 'Authentication required. Please log in again.',
            type: 'auth',
            details: data,
            timestamp
          };
        case 403:
          return {
            message: 'You don\'t have permission to perform this action.',
            type: 'auth',
            details: data,
            timestamp
          };
        case 422:
        case 400:
          return {
            message: data?.error || 'Invalid data provided.',
            type: 'validation',
            details: data,
            timestamp
          };
        case 500:
          return {
            message: 'Server error. Please try again later.',
            type: 'server',
            details: data,
            timestamp
          };
        default:
          return {
            message: data?.error || `Server returned error ${status}`,
            type: 'server',
            details: data,
            timestamp
          };
      }
    } else if (error.request) {
      // Network error
      return {
        message: 'Network error. Please check your connection.',
        type: 'network',
        details: error.request,
        timestamp
      };
    } else {
      // Other errors
      return {
        message: error.message || 'An unexpected error occurred.',
        type: 'unknown',
        details: error,
        timestamp
      };
    }
  }

  static showError(error: AppError, showAlert: boolean = true) {
    console.error('Application Error:', error);
    
    if (showAlert) {
      alert(error.message);
    }
    
    // Here you could integrate with a toast notification system
    // or error reporting service like Sentry
  }

  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    showAlert: boolean = true
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      const appError = ErrorHandler.handle(error);
      ErrorHandler.showError(appError, showAlert);
      return null;
    }
  }
}

// Custom hook for error handling
export function useErrorHandler() {
  const handleError = (error: any, showAlert: boolean = true) => {
    const appError = ErrorHandler.handle(error);
    ErrorHandler.showError(appError, showAlert);
    return appError;
  };

  const withErrorHandling = async <T>(
    operation: () => Promise<T>,
    showAlert: boolean = true
  ): Promise<T | null> => {
    return ErrorHandler.withErrorHandling(operation, showAlert);
  };

  return { handleError, withErrorHandling };
}