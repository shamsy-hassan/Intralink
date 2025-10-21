import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Zap, 
  Shield, 
  Users, 
  Clock, 
  CheckCircle2,
  Eye,
  Send,
  Building,
  Globe,
  AlertCircle,
  Bell,
  MapPin,
  Phone
} from 'lucide-react';
import { api } from '../../lib/api';
import { ErrorHandler } from '../../lib/errorHandler';
import { LoadingButton } from '../common/LoadingSystem';
import { useToastHelpers } from '../common/Toast';
import { useFormValidation } from '../../lib/validation';
import type { ValidationRule } from '../../lib/validation';
import { FormInput, FormSelect } from '../common/FormComponents';

interface EmergencyAlert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'fire' | 'medical' | 'security' | 'weather' | 'system' | 'evacuation' | 'other';
  targetType: 'all' | 'department' | 'location' | 'role';
  target: string;
  status: 'active' | 'resolved' | 'cancelled';
  sentAt: string;
  acknowledgedBy: number;
  totalRecipients: number;
  escalationLevel: number;
  expiresAt?: string;
  location?: string;
  instructions?: string;
}

const EmergencyAlerts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'active' | 'history'>('create');
  const [alertType, setAlertType] = useState<'fire' | 'medical' | 'security' | 'weather' | 'system' | 'evacuation' | 'other'>('fire');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [targetType, setTargetType] = useState<'all' | 'department' | 'location' | 'role'>('all');
  const [target, setTarget] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [instructions, setInstructions] = useState('');
  const [requireAcknowledgment, setRequireAcknowledgment] = useState(true);
  const [autoEscalation, setAutoEscalation] = useState(false);
  const [escalationTime, setEscalationTime] = useState(5);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  const { showSuccess, showError } = useToastHelpers();

  // Form validation rules
  const validationRules: Record<string, ValidationRule> = {
    title: { 
      required: true, 
      minLength: 3, 
      maxLength: 200 
    },
    message: { 
      required: true, 
      minLength: 10, 
      maxLength: 2000 
    },
    target: {
      required: targetType !== 'all',
      custom: (value) => {
        if (targetType !== 'all' && !value?.trim()) {
          return 'Please select a target for this alert type';
        }
        return null;
      }
    },
    scheduledDate: {
      required: isScheduled,
      custom: (value) => {
        if (isScheduled && !value) {
          return 'Scheduled date is required';
        }
        if (isScheduled && new Date(value) < new Date()) {
          return 'Scheduled date must be in the future';
        }
        return null;
      }
    },
    scheduledTime: {
      required: isScheduled,
      custom: (value) => {
        if (isScheduled && !value) {
          return 'Scheduled time is required';
        }
        return null;
      }
    }
  };

  const {
    errors: formErrors,
    touched,
    updateField,
    touchField,
    validateAll,
    reset: resetForm
  } = useFormValidation({
    initialData: { title, message, target, scheduledDate, scheduledTime },
    validationRules
  });
  const [activeAlerts, setActiveAlerts] = useState<EmergencyAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<EmergencyAlert[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setDataLoading(true);

      // Load alerts and departments
      const [alertsResponse, departmentsResponse] = await Promise.all([
        api.get('/alerts/'),
        api.get('/departments/')
      ]);

      const alerts = alertsResponse.data.alerts || [];
      setActiveAlerts(alerts.filter((alert: any) => alert.is_active));
      setAlertHistory(alerts.filter((alert: any) => !alert.is_active));
      
      const depts = departmentsResponse.data.departments || [];
      setDepartments(depts.map((d: any) => d.name));

    } catch (err: any) {
      console.error('Error loading alerts data:', err);
    } finally {
      setDataLoading(false);
    }
  };
  const locations = ['Building A', 'Building B', 'Warehouse', 'Parking Lot', 'Cafeteria'];
  const roles = ['Admin', 'HR', 'Staff', 'Security', 'Management'];

  const alertTemplates = {
    fire: {
      title: 'Fire Emergency - Immediate Evacuation Required',
      message: 'A fire has been detected in the building. Please evacuate immediately using the nearest emergency exit.',
      instructions: '1. Leave the building immediately\n2. Use stairs, not elevators\n3. Proceed to the assembly point\n4. Wait for further instructions'
    },
    medical: {
      title: 'Medical Emergency in Progress',
      message: 'A medical emergency is occurring. Please clear the area and allow emergency personnel access.',
      instructions: '1. Clear the immediate area\n2. Do not interfere with emergency responders\n3. Provide assistance only if trained\n4. Wait for all-clear signal'
    },
    security: {
      title: 'Security Alert - Lockdown in Effect',
      message: 'A security incident is in progress. Please remain in a secure location until further notice.',
      instructions: '1. Remain in current location\n2. Lock doors if possible\n3. Stay away from windows\n4. Await further instructions'
    },
    weather: {
      title: 'Severe Weather Warning',
      message: 'Severe weather is approaching. Please move to designated safe areas immediately.',
      instructions: '1. Move to interior rooms\n2. Stay away from windows\n3. Monitor emergency communications\n4. Do not leave the building'
    },
    evacuation: {
      title: 'Building Evacuation Required',
      message: 'All personnel must evacuate the building immediately due to an emergency situation.',
      instructions: '1. Exit the building calmly\n2. Use designated evacuation routes\n3. Proceed to assembly areas\n4. Report to your supervisor'
    },
    system: {
      title: 'Critical System Alert',
      message: 'A critical system failure has occurred. Please follow emergency protocols.',
      instructions: '1. Save your work immediately\n2. Follow backup procedures\n3. Contact IT support\n4. Await system restoration'
    }
  };

  const handleTemplateSelect = (category: string) => {
    setAlertType(category as any);
    const template = alertTemplates[category as keyof typeof alertTemplates];
    if (template) {
      setTitle(template.title);
      setMessage(template.message);
      setInstructions(template.instructions);
    }
  };

  const handleSendAlert = async () => {
    // Use form validation
    const isValid = validateAll();
    if (!isValid) {
      showError('Please fix the form errors before sending the alert');
      return;
    }

    try {
      setSendLoading(true);
      // Map frontend types to backend types
      let backendAlertType: string;
      switch (alertType) {
        case 'fire':
        case 'medical':
        case 'security':
        case 'evacuation':
          backendAlertType = 'emergency';
          break;
        case 'weather':
          backendAlertType = 'warning';
          break;
        case 'system':
        default:
          backendAlertType = 'info';
          break;
      }

      let backendScope: string;
      let departmentId: number | undefined;
      let targetUserIds: number[] | undefined;

      switch (targetType) {
        case 'all':
          backendScope = 'global';
          break;
        case 'department':
          backendScope = 'department';
          // For now, map department names to IDs (this should come from a departments API)
          const deptMapping: { [key: string]: number } = {
            'Engineering': 1,
            'Sales': 2,
            'HR': 3,
            'Marketing': 4,
            'Operations': 5
          };
          departmentId = deptMapping[target];
          break;
        case 'role':
        case 'location':
          backendScope = 'individual';
          // For now, we'll treat these as global since we don't have user mapping
          backendScope = 'global';
          break;
        default:
          backendScope = 'global';
      }

      // Prepare API payload
      const alertData = {
        title,
        message,
        alert_type: backendAlertType,
        scope: backendScope,
        department_id: departmentId,
        target_user_ids: targetUserIds,
        is_urgent: severity === 'critical' || severity === 'high',
        requires_acknowledgment: requireAcknowledgment,
        send_immediately: !isScheduled,
        scheduled_at: isScheduled ? `${scheduledDate}T${scheduledTime}:00` : undefined,
        expires_at: autoEscalation ? new Date(Date.now() + escalationTime * 60 * 1000).toISOString() : undefined
      };

      console.log('Sending alert to backend:', alertData);

      // Send to backend
      const response = await api.post('/alerts/', alertData);
      console.log('Backend response:', response);

      if (response.data) {
        // Create UI alert object for immediate display
        const newAlert: EmergencyAlert = {
          id: response.data.alert?.id?.toString() || Date.now().toString(),
          title,
          message,
          severity,
          category: alertType,
          targetType,
          target: targetType === 'all' ? 'All Employees' : target,
          status: 'active',
          sentAt: new Date().toISOString(),
          acknowledgedBy: 0,
          totalRecipients: targetType === 'all' ? 436 : Math.floor(Math.random() * 200),
          escalationLevel: 1,
          location,
          instructions
        };

        // Add the new alert to active alerts
        setActiveAlerts(prevAlerts => [newAlert, ...prevAlerts]);

        console.log('Alert sent successfully:', response.data);
        showSuccess('Alert sent successfully!');
        
        // Reset form
        setTitle('');
        setMessage('');
        setLocation('');
        setInstructions('');
        setTarget('');
        setIsScheduled(false);
        setScheduledDate('');
        setScheduledTime('');
        resetForm();
        
        // Switch to active alerts
        setActiveTab('active');
      }
    } catch (error: any) {
      console.error('Error sending alert:', error);
      const appError = ErrorHandler.handle(error);
      showError('Alert Send Failed', appError.message);
    } finally {
      setSendLoading(false);
    }
  };  const handleResolveAlert = (alertId: string) => {
    setActiveAlerts(prevAlerts => 
      prevAlerts.filter(alert => alert.id !== alertId)
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white border-red-600';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'fire':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medical':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'security':
        return <Shield className="w-4 h-4 text-purple-500" />;
      case 'weather':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'system':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'evacuation':
        return <Users className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case 'all':
        return <Globe className="w-4 h-4" />;
      case 'department':
        return <Building className="w-4 h-4" />;
      case 'location':
        return <MapPin className="w-4 h-4" />;
      case 'role':
        return <Users className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <span>Emergency Alert System</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage critical communications and emergency notifications
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-red-700">
                {activeAlerts.length} Active Alert{activeAlerts.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center space-x-2"
          >
            <Phone className="w-4 h-4" />
            <span>Emergency Contacts</span>
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'create', label: 'Create Alert', icon: <Zap className="w-4 h-4" /> },
            { id: 'active', label: 'Active Alerts', icon: <AlertTriangle className="w-4 h-4" />, badge: activeAlerts.length },
            { id: 'history', label: 'Alert History', icon: <Clock className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Create Alert Tab */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Quick Templates */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Templates</h2>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(alertTemplates).map(([key, template]) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTemplateSelect(key)}
                    className={`p-3 border rounded-lg text-left transition-colors hover:border-red-300 hover:bg-red-50 ${
                      alertType === key ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      {getCategoryIcon(key)}
                      <span className="font-medium text-sm capitalize">{key}</span>
                    </div>
                    <p className="text-xs text-gray-600">{template.title}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Alert Configuration */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Alert Configuration</h2>
              
              {/* Severity */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Severity Level
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'critical', label: 'Critical', color: 'red' },
                    { id: 'high', label: 'High', color: 'orange' },
                    { id: 'medium', label: 'Medium', color: 'yellow' },
                    { id: 'low', label: 'Low', color: 'green' }
                  ].map((s) => (
                    <motion.button
                      key={s.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSeverity(s.id as any)}
                      className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                        severity === s.id
                          ? s.id === 'critical' 
                            ? 'border-red-600 bg-red-600 text-white'
                            : `border-${s.color}-500 bg-${s.color}-50 text-${s.color}-700`
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {s.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Target Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Alert Recipients
                </label>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {[
                    { id: 'all', label: 'Everyone', icon: <Globe className="w-4 h-4" /> },
                    { id: 'department', label: 'Department', icon: <Building className="w-4 h-4" /> },
                    { id: 'location', label: 'Location', icon: <MapPin className="w-4 h-4" /> },
                    { id: 'role', label: 'Role', icon: <Users className="w-4 h-4" /> }
                  ].map((type) => (
                    <motion.button
                      key={type.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setTargetType(type.id as any)}
                      className={`p-2 border rounded-lg flex items-center space-x-2 text-sm transition-colors ${
                        targetType === type.id
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {type.icon}
                      <span>{type.label}</span>
                    </motion.button>
                  ))}
                </div>
                
                {targetType !== 'all' && (
                  <FormSelect
                    label={`Select ${targetType.charAt(0).toUpperCase() + targetType.slice(1)}`}
                    value={target}
                    onChange={(value) => {
                      setTarget(value);
                      updateField('target', value);
                    }}
                    onBlur={() => touchField('target')}
                    options={(targetType === 'department' ? departments : 
                      targetType === 'location' ? locations : roles).map((item) => ({
                      value: item,
                      label: item
                    }))}
                    placeholder={`Select ${targetType}...`}
                    required={true}
                    errors={touched.target ? formErrors.target : []}
                  />
                )}
              </div>

              {/* Alert Details */}
              <div className="space-y-4">
                <FormInput
                  label="Alert Title"
                  value={title}
                  onChange={(value) => {
                    setTitle(value);
                    updateField('title', value);
                  }}
                  onBlur={() => touchField('title')}
                  placeholder="Enter alert title..."
                  required={true}
                  errors={touched.title ? formErrors.title : []}
                />

                <FormInput
                  label="Alert Message"
                  value={message}
                  onChange={(value) => {
                    setMessage(value);
                    updateField('message', value);
                  }}
                  onBlur={() => touchField('message')}
                  placeholder="Enter alert message..."
                  required={true}
                  errors={touched.message ? formErrors.message : []}
                  multiline={true}
                  rows={4}
                />

                <FormInput
                  label="Location"
                  value={location}
                  onChange={setLocation}
                  placeholder="Specific location or area..."
                  required={false}
                />

                <FormInput
                  label="Instructions"
                  value={instructions}
                  onChange={setInstructions}
                  placeholder="Step-by-step instructions..."
                  required={false}
                  multiline={true}
                  rows={4}
                />
              </div>

              {/* Options */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="acknowledgment"
                    checked={requireAcknowledgment}
                    onChange={(e) => setRequireAcknowledgment(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="acknowledgment" className="text-sm text-gray-700">
                    Require acknowledgment from recipients
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="escalation"
                    checked={autoEscalation}
                    onChange={(e) => setAutoEscalation(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="escalation" className="text-sm text-gray-700">
                    Auto-escalate if not acknowledged within
                  </label>
                  {autoEscalation && (
                    <input
                      type="number"
                      value={escalationTime}
                      onChange={(e) => setEscalationTime(parseInt(e.target.value))}
                      min="1"
                      max="60"
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  )}
                  {autoEscalation && <span className="text-sm text-gray-700">minutes</span>}
                </div>
              </div>

              {/* Send Button */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <LoadingButton
                  loading={sendLoading}
                  onClick={handleSendAlert}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                  <span>Send Emergency Alert</span>
                </LoadingButton>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Preview</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${getSeverityColor(severity)}`}>
                      {severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">EMERGENCY ALERT</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">
                    {title || 'Alert Title'}
                  </h4>
                  <p className="text-sm text-gray-700 mb-3">
                    {message || 'Alert message will appear here...'}
                  </p>
                  
                  {location && (
                    <div className="flex items-center space-x-1 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>Location: {location}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
                    {getTargetIcon(targetType)}
                    <span>
                      Recipients: {targetType === 'all' ? 'All Employees' : target || 'Select target'}
                    </span>
                  </div>

                  {instructions && (
                    <div className="bg-white border border-red-200 rounded p-3 mt-3">
                      <h5 className="font-medium text-sm text-gray-900 mb-2">Instructions:</h5>
                      <p className="text-xs text-gray-700 whitespace-pre-line">{instructions}</p>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-red-200">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Sent: {new Date().toLocaleString()}</span>
                      {requireAcknowledgment && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Acknowledgment Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts Tab */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeAlerts.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Alerts</h3>
              <p className="mt-1 text-sm text-gray-500">
                All emergency situations have been resolved.
              </p>
            </div>
          ) : (
            activeAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border-l-4 border-l-red-500 shadow-sm"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getCategoryIcon(alert.category)}
                        <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-4">{alert.message}</p>
                      
                      {alert.location && (
                        <div className="flex items-center space-x-1 text-sm text-gray-600 mb-2">
                          <MapPin className="w-4 h-4" />
                          <span>Location: {alert.location}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-sm">
                          <span className="text-gray-500">Recipients:</span>
                          <p className="font-medium">{alert.totalRecipients}</p>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Acknowledged:</span>
                          <p className="font-medium text-green-600">
                            {alert.acknowledgedBy} ({Math.round((alert.acknowledgedBy / alert.totalRecipients) * 100)}%)
                          </p>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Sent:</span>
                          <p className="font-medium">{new Date(alert.sentAt).toLocaleString()}</p>
                        </div>
                        {alert.expiresAt && (
                          <div className="text-sm">
                            <span className="text-gray-500">Expires:</span>
                            <p className="font-medium text-orange-600">{new Date(alert.expiresAt).toLocaleString()}</p>
                          </div>
                        )}
                      </div>

                      {alert.instructions && (
                        <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
                          <h5 className="font-medium text-sm text-gray-900 mb-2">Instructions:</h5>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{alert.instructions}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="text-gray-400 hover:text-blue-500 p-2"
                      >
                        <Eye className="w-5 h-5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleResolveAlert(alert.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                      >
                        Resolve
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleResolveAlert(alert.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Alert History</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {alertHistory.map((alert) => (
              <div key={alert.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getCategoryIcon(alert.category)}
                      <h3 className="font-medium text-gray-900">{alert.title}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        alert.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{alert.message}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                      <span>Recipients: {alert.totalRecipients}</span>
                      <span>Acknowledged: {alert.acknowledgedBy}</span>
                      <span>Sent: {new Date(alert.sentAt).toLocaleString()}</span>
                      <span>Escalation: Level {alert.escalationLevel}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="text-gray-400 hover:text-blue-500 p-1"
                    >
                      <Eye className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyAlerts;