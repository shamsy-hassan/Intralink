import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, User, Building, ArrowLeft, Check } from 'lucide-react';
import { onboardingAPI, type Department } from '../../lib/onboardingApi';

interface ProfileSetupProps {
  workId: string;
  onComplete: (profileData: ProfileData) => void;
  onBack: () => void;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  departmentId: string;
  profilePhoto?: string;
  phone?: string;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ workId, onComplete, onBack }) => {
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    departmentId: '',
    profilePhoto: '',
    phone: ''
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load departments on component mount
    const loadDepartments = async () => {
      try {
        const response = await onboardingAPI.getDepartments();
        setDepartments(response.departments);
      } catch (error) {
        console.error('Failed to load departments:', error);
        setError('Failed to load departments. Please refresh the page.');
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileData({
          ...profileData,
          profilePhoto: event.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData.firstName || !profileData.lastName) {
      setError('Please enter your first and last name');
      return;
    }
    
    if (!profileData.departmentId) {
      setError('Please select your department');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await onboardingAPI.completeProfile({
        workId,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        departmentId: profileData.departmentId,
        profilePhoto: profileData.profilePhoto,
        phone: profileData.phone
      });

      // Store authentication tokens
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user_data', JSON.stringify(response.user));

      onComplete({
        ...profileData,
        userData: response.user,
        tokens: {
          access_token: response.access_token,
          refresh_token: response.refresh_token
        }
      } as any);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create profile. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = profileData.firstName && profileData.lastName && profileData.departmentId;

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
            Setup Profile
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
          {/* Profile Setup Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <User className="w-8 h-8 text-emerald-600" />
              </motion.div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Setup Your Profile
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Let's personalize your IntraLink experience
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Photo */}
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-20 h-20 bg-gray-100 rounded-full overflow-hidden border-4 border-gray-200">
                    {profileData.profilePhoto ? (
                      <img 
                        src={profileData.profilePhoto} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-600 transition-colors shadow-lg">
                    <Camera className="w-4 h-4 text-white" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">Optional profile photo</p>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      firstName: e.target.value
                    })}
                    placeholder="John"
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      lastName: e.target.value
                    })}
                    placeholder="Doe"
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <div className="relative">
                  <select
                    value={profileData.departmentId}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      departmentId: e.target.value
                    })}
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
                    disabled={isLoading}
                  >
                    <option value="">Select your department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <Building className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Work ID Display */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Work ID</p>
                <p className="font-mono text-lg font-semibold text-gray-900">{workId}</p>
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

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={!isFormValid || isLoading}
                whileHover={{ scale: isFormValid ? 1.02 : 1 }}
                whileTap={{ scale: isFormValid ? 0.98 : 1 }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Profile...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4" />
                    <span>Complete Setup</span>
                  </div>
                )}
              </motion.button>
            </form>
          </div>

          {/* Progress Indicator */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center"
          >
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            </div>
            <p className="text-xs text-gray-400">Step 3 of 3</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileSetup;