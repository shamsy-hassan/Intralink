import { BrowserRouter as Router } from 'react-router-dom';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './components/common/LoadingSystem';
import { ToastProvider } from './components/common/Toast';

function App() {
  const handleOnboardingComplete = (userData: any) => {
    console.log('Onboarding completed:', userData);
  };

  return (
    <LoadingProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <OnboardingFlow onComplete={handleOnboardingComplete} />
          </Router>
        </AuthProvider>
      </ToastProvider>
    </LoadingProvider>
  );
}

export default App;