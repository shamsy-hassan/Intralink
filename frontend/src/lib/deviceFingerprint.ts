/**
 * Device Fingerprinting Utility
 * Generates a semi-persistent device identifier for authentication
 */

export interface DeviceFingerprint {
  screen_width: number;
  screen_height: number;
  available_width: number;
  available_height: number;
  color_depth: number;
  pixel_ratio: number;
  timezone: string;
  language: string;
  languages: string;
  platform: string;
  cookie_enabled: boolean;
  do_not_track: string | null;
  canvas_fingerprint: string;
  local_storage: boolean;
  session_storage: boolean;
  indexed_db: boolean;
  web_gl_vendor: string | null;
  touch_support: boolean;
  max_touch_points: number;
}

export function generateDeviceFingerprint(): DeviceFingerprint {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
  }
  
  return {
    screen_width: screen.width,
    screen_height: screen.height,
    available_width: screen.availWidth,
    available_height: screen.availHeight,
    color_depth: screen.colorDepth,
    pixel_ratio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    languages: navigator.languages ? navigator.languages.join(',') : '',
    platform: navigator.platform,
    cookie_enabled: navigator.cookieEnabled,
    do_not_track: navigator.doNotTrack,
    canvas_fingerprint: canvas.toDataURL(),
    local_storage: !!window.localStorage,
    session_storage: !!window.sessionStorage,
    indexed_db: !!window.indexedDB,
    web_gl_vendor: getWebGLVendor(),
    touch_support: 'ontouchstart' in window,
    max_touch_points: navigator.maxTouchPoints || 0
  };
}

function getWebGLVendor(): string | null {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && 'getParameter' in gl) {
      const webgl = gl as WebGLRenderingContext;
      const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        return webgl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      }
      return webgl.getParameter(webgl.VENDOR);
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Get or create a persistent device ID from localStorage
 * Falls back to session-based ID if localStorage is not available
 */
export function getDeviceId(): string {
  const DEVICE_ID_KEY = 'intralink_device_id';
  
  try {
    // Try to get existing device ID
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Generate new device ID
      deviceId = generateSecureDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  } catch (e) {
    // localStorage not available, use session storage or generate temporary ID
    try {
      let deviceId = sessionStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = generateSecureDeviceId();
        sessionStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch (e) {
      // Generate temporary device ID
      return generateSecureDeviceId();
    }
  }
}

function generateSecureDeviceId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 9);
  const fingerprint = generateBasicFingerprint();
  
  // Combine and hash
  const combined = `${timestamp}-${random}-${fingerprint}`;
  return btoa(combined).replace(/[+/=]/g, '').substr(0, 32);
}

function generateBasicFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset()
  ];
  
  return components.join('|');
}

/**
 * Check if device supports persistent storage
 */
export function supportsPeristentStorage(): boolean {
  try {
    return !!window.localStorage;
  } catch (e) {
    return false;
  }
}

/**
 * Get device information for display purposes
 */
export function getDeviceInfo(): {
  type: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  name: string;
} {
  const userAgent = navigator.userAgent;
  
  // Detect device type
  let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/tablet|ipad/i.test(userAgent)) {
    type = 'tablet';
  } else if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(userAgent)) {
    type = 'mobile';
  }
  
  // Detect browser
  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';
  
  // Detect OS
  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';
  
  // Generate friendly name
  const name = `${browser} on ${os}`;
  
  return { type, browser, os, name };
}

/**
 * Clear device ID (for logout/reset)
 */
export function clearDeviceId(): void {
  const DEVICE_ID_KEY = 'intralink_device_id';
  
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
  } catch (e) {
    // Ignore
  }
  
  try {
    sessionStorage.removeItem(DEVICE_ID_KEY);
  } catch (e) {
    // Ignore
  }
}