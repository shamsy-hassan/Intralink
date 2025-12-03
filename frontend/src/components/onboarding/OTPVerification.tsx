import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Smartphone, ArrowLeft, RotateCcw } from 'lucide-react';
import { onboardingAPI } from '../../lib/onboardingApi';
import { useAuth } from '../../context/AuthContext';

interface OTPVerificationProps {
  workId: string;
  contactInfo: { method: string; contact: string };
  onNext: (otp: string) => void;
  onBack: () => void;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({ workId, contactInfo, onNext, onBack }) => {
  const navigate = useNavigate();
  const { checkAuthStatus } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get contact method and masked contact from props
  const contactMethod = contactInfo.method || 'email';
  const maskedContact = contactInfo.contact || 'j***@company.com';

  useEffect(() => {
    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newOtp.every(digit => digit !== '') && value) {
      handleSubmit(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (otpCode: string = otp.join('')) => {
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await onboardingAPI.verifyOTP({ workId, otp: otpCode });
      
      // Check if user exists and is logged in
      if (response.user && response.requires_profile === false) {
        // The backend has set the session cookie.
        // We need to update the auth context.
        await checkAuthStatus();
        navigate('/user/dashboard');
        return;
      }
      
      // If user does not exist, continue to profile setup
      onNext(otpCode);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Invalid verification code. Please try again.';
      setError(message);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setCountdown(60);
    setError('');
    
    try {
      const response = await onboardingAPI.resendOTP(workId);
      
      // Store new OTP for demo purposes (remove in production)
      if (response.otp) {
        localStorage.setItem('demo_otp', response.otp);
      }
      
      // Restart countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      setError('Failed to resend code. Please try again.');
      setCanResend(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-sm border-b border-gray-100"
      >
        <div className="max-w-md mx-auto px-6 py-4 flex items-center">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="flex-1 text-center text-lg font-semibold text-gray-900">
            Verify Identity
          </h1>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-sm"
        >
          {/* Verification Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                {contactMethod === 'email' ? (
                  <Mail className="w-8 h-8 text-emerald-600" />
                ) : (
                  <Smartphone className="w-8 h-8 text-emerald-600" />
                )}
              </motion.div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Enter Verification Code
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                We've sent a 6-digit code to your company {contactMethod}
              </p>
              <p className="text-emerald-600 font-medium text-sm mt-1">
                {maskedContact}
              </p>
            </div>

            {/* OTP Input */}
            <div className="mb-6">
              <div className="flex space-x-3 justify-center mb-4">
                {otp.map((digit, index) => (
                  <motion.input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    disabled={isLoading}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                  />
                ))}
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}
            </div>

            {/* Loading or Manual Submit */}
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center py-4"
              >
                <div className="flex items-center space-x-2 text-emerald-600">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Verifying...</span>
                </div>
              </motion.div>
            )}

            {/* Resend Code */}
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-3">
                Didn't receive the code?
              </p>
              {canResend ? (
                <button
                  onClick={handleResend}
                  className="flex items-center justify-center space-x-1 text-emerald-600 hover:text-emerald-700 font-medium text-sm mx-auto transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Resend Code</span>
                </button>
              ) : (
                <p className="text-gray-400 text-sm">
                  Resend available in {formatTime(countdown)}
                </p>
              )}
            </div>
          </div>

          {/* Help Text */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center"
          >
            <p className="text-xs text-gray-400">
              Check your spam folder if you don't see the {contactMethod}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default OTPVerification;