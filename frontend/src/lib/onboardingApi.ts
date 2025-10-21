import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export interface WorkIdVerificationRequest {
  workId: string;
}

export interface WorkIdVerificationResponse {
  message: string;
  workId: string;
  contactMethod: string;
  maskedContact: string;
  otp?: string; // Only for demo purposes
}

export interface OTPVerificationRequest {
  workId: string;
  otp: string;
}

export interface OTPVerificationResponse {
  message: string;
  workId?: string;
  access_token?: string;
  refresh_token?: string;
  user?: any;
  temp_password?: string;
}

export interface ProfileSetupRequest {
  workId: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  profilePhoto?: string;
  phone?: string;
}

export interface ProfileSetupResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  user: any;
  temp_password?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
}

export interface DepartmentsResponse {
  departments: Department[];
}

class OnboardingAPI {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: `${API_BASE_URL}/onboarding`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async verifyWorkId(data: WorkIdVerificationRequest): Promise<WorkIdVerificationResponse> {
    const response = await this.axiosInstance.post('/verify-work-id', data);
    return response.data;
  }

  async verifyOTP(data: OTPVerificationRequest): Promise<OTPVerificationResponse> {
    const response = await this.axiosInstance.post('/verify-otp', data);
    return response.data;
  }

  async completeProfile(data: ProfileSetupRequest): Promise<ProfileSetupResponse> {
    const response = await this.axiosInstance.post('/complete-profile', data);
    return response.data;
  }

  async resendOTP(workId: string): Promise<{ message: string; otp?: string }> {
    const response = await this.axiosInstance.post('/resend-otp', { workId });
    return response.data;
  }

  async getDepartments(): Promise<DepartmentsResponse> {
    const response = await this.axiosInstance.get('/departments');
    return response.data;
  }
}

export const onboardingAPI = new OnboardingAPI();