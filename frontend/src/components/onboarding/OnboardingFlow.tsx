import React, { useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import OTPVerification from './OTPVerification';
import ProfileSetup from './ProfileSetup';

type OnboardingStep = 'welcome' | 'otp' | 'profile';

interface OnboardingFlowProps {
  onComplete: (userData: any) => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [workId, setWorkId] = useState('');
  const [contactInfo, setContactInfo] = useState({ method: '', contact: '' });
  const [otpCode, setOtpCode] = useState('');

  const handleWelcomeNext = (workIdValue: string, contactDetails: { method: string; contact: string }) => {
    setWorkId(workIdValue);
    setContactInfo(contactDetails);
    setCurrentStep('otp');
  };

  const handleOTPNext = (otp: string) => {
    setOtpCode(otp);
    setCurrentStep('profile');
  };

  const handleProfileComplete = (profileData: any) => {
    // All onboarding data is already saved in localStorage by ProfileSetup
    onComplete(profileData);
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'otp':
        setCurrentStep('welcome');
        break;
      case 'profile':
        setCurrentStep('otp');
        break;
    }
  };

  return (
    <>
      {currentStep === 'welcome' && (
        <WelcomeScreen onNext={handleWelcomeNext} />
      )}
      {currentStep === 'otp' && (
        <OTPVerification
          workId={workId}
          contactInfo={contactInfo}
          onNext={handleOTPNext}
          onBack={handleBack}
        />
      )}
      {currentStep === 'profile' && (
        <ProfileSetup
          workId={workId}
          onComplete={handleProfileComplete}
          onBack={handleBack}
        />
      )}
    </>
  );
};

export default OnboardingFlow;