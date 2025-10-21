# IntraLink Demo Credentials

This document provides all the login credentials for testing both the admin dashboard and user onboarding flows.

## 🔐 Admin Dashboard Credentials

Access the admin dashboard at: `/admin/login`

### Super Admin (Full Access)
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Super Admin
- **Permissions:** Full system access, user management, emergency alerts, broadcasting, analytics
- **Department:** Administration

### HR Manager (User Management)
- **Username:** `hr_manager`
- **Password:** `hr123`
- **Role:** HR
- **Permissions:** User management, employee onboarding, department oversight
- **Department:** Human Resources

### IT Admin (System Configuration)
- **Username:** `it_admin`
- **Password:** `tech456`
- **Role:** Admin
- **Permissions:** System configuration, technical support, emergency alerts
- **Department:** IT

## 👥 User Onboarding Work IDs

Access the user onboarding at: `/` (root path)

### Engineering Department
- **Work ID:** `ENG001`
- **Employee:** John Smith
- **Department:** Engineering
- **Role:** Staff
- **Phone:** +1 (555) 123-4567
- **Email:** john.smith@company.com

### Human Resources Department
- **Work ID:** `HR001`
- **Employee:** Sarah Johnson
- **Department:** HR
- **Role:** HR
- **Phone:** +1 (555) 987-6543
- **Email:** sarah.johnson@company.com

### Sales Department
- **Work ID:** `SAL001`
- **Employee:** Mike Wilson
- **Department:** Sales
- **Role:** Staff
- **Phone:** +1 (555) 456-7890
- **Email:** mike.wilson@company.com

### Marketing Department
- **Work ID:** `MKT001`
- **Employee:** Emily Davis
- **Department:** Marketing
- **Role:** Staff
- **Phone:** +1 (555) 321-0987
- **Email:** emily.davis@company.com

### Operations Department
- **Work ID:** `OPS001`
- **Employee:** David Brown
- **Department:** Operations
- **Role:** Staff
- **Phone:** +1 (555) 654-3210
- **Email:** david.brown@company.com

## 📱 OTP Verification

For any Work ID during onboarding, use the demo OTP:
- **OTP Code:** `123456`

This code will work for all demo Work IDs during the verification step.

## 🎯 Testing Scenarios

### Admin Dashboard Testing
1. **Super Admin Flow:**
   - Login with `admin / admin123`
   - Access all features: dashboard, user management, broadcasting, emergency alerts
   - Create new users, send company-wide announcements, trigger emergency alerts

2. **HR Manager Flow:**
   - Login with `hr_manager / hr123`
   - Focus on user management and employee onboarding
   - Add new employees, manage departments, view user analytics

3. **IT Admin Flow:**
   - Login with `it_admin / tech456`
   - Manage system settings and technical configurations
   - Handle emergency alerts and system maintenance notifications

### User Onboarding Testing
1. **Complete Onboarding Flow:**
   - Start with any Work ID (e.g., `ENG001`)
   - Enter OTP: `123456`
   - Complete profile setup with personal information
   - Access the WhatsApp-style chat interface

2. **Different Departments:**
   - Test each department Work ID to see department-specific features
   - Verify proper department assignment and role-based access

## 🔄 Reset Instructions

To reset any demo account or start fresh:
1. Clear browser localStorage: `localStorage.clear()`
2. Refresh the application
3. Use any of the above credentials to start again

## 🚀 Quick Start Guide

### For Admin Testing:
1. Go to `/admin/login`
2. Click any demo credential box to auto-fill
3. Click "Sign In"
4. Explore the admin dashboard features

### For User Testing:
1. Go to `/` (home page)
2. Click any demo Work ID to auto-fill
3. Click "Verify Identity"
4. Enter OTP: `123456`
5. Complete profile setup
6. Access the chat interface

## 📋 Feature Access Matrix

| Feature | Super Admin | HR Manager | IT Admin | Regular User |
|---------|-------------|------------|----------|--------------|
| Dashboard Overview | ✅ | ✅ | ✅ | ❌ |
| User Management | ✅ | ✅ | ❌ | ❌ |
| Broadcasting | ✅ | ✅ | ✅ | ❌ |
| Emergency Alerts | ✅ | ❌ | ✅ | ❌ |
| Analytics | ✅ | ✅ | ❌ | ❌ |
| Chat Interface | ❌ | ❌ | ❌ | ✅ |
| Settings | ✅ | ❌ | ✅ | ❌ |

## 🔒 Security Notes

These are demo credentials for testing purposes only. In a production environment:
- Use strong, unique passwords
- Implement proper authentication
- Enable two-factor authentication
- Regular credential rotation
- Role-based access controls

---

*Last updated: October 16, 2025*