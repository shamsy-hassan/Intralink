import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Shield, Users, Settings } from 'lucide-react';
import { onboardingAPI } from '../../lib/onboardingApi';

interface WelcomeScreenProps {
  onNext: (workId: string, contactInfo: { method: string; contact: string }) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNext }) => {
  const navigate = useNavigate();
  const [workId, setWorkId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workId.trim()) {
      setError('Please enter your Work ID');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await onboardingAPI.verifyWorkId({ workId: workId.trim() });
      
      // Store OTP for demo purposes (remove in production)
      if (response.otp) {
        localStorage.setItem('demo_otp', response.otp);
      }
      
      onNext(workId.trim(), {
        method: response.contactMethod,
        contact: response.maskedContact
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Verification failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-sm border-b border-gray-100"
      >
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">IntraLink</h1>
          </div>
          <p className="text-center text-gray-500 text-sm mt-1">
            Internal Communication Platform
          </p>
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
          {/* Welcome Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="text-center mb-8">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Shield className="w-8 h-8 text-emerald-600" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to IntraLink
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Enter your Work ID to verify your identity and join your company's communication network
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="workId" className="block text-sm font-medium text-gray-700 mb-2">
                  Work ID / Staff ID
                </label>
                <input
                  type="text"
                  id="workId"
                  value={workId}
                  onChange={(e) => setWorkId(e.target.value)}
                  placeholder="Enter your Work ID"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-lg"
                  disabled={isLoading}
                />
                {error && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm mt-2"
                  >
                    {error}
                  </motion.p>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={isLoading || !workId.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify Identity'
                )}
              </motion.button>
            </form>
          </div>

          {/* Features */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl p-6 shadow-sm"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-4 h-4 mr-2 text-emerald-500" />
              What you'll get:
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                Instant messaging with colleagues
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                Real-time emergency alerts
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                Department-wide announcements
              </li>
              <li className="flex items-start">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                Secure, verified communication
              </li>
            </ul>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="px-6 py-4 text-center space-y-3"
      >
        <button
          onClick={() => navigate('/admin/login')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center space-x-1 mx-auto transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Admin Access</span>
        </button>
        <p className="text-xs text-gray-400">
          Need help? Contact your HR department or IT support
        </p>
      </motion.div>
    </div>
  );
};

export default WelcomeScreen;