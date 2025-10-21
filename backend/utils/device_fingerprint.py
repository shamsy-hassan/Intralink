import hashlib
import json
from flask import request
from user_agents import parse

def generate_device_fingerprint(user_agent=None, accept_language=None, additional_data=None):
    """
    Generate a device fingerprint from browser characteristics
    This creates a semi-persistent device ID that survives browser restarts
    but changes if user clears all data or uses incognito mode extensively
    """
    if not user_agent:
        user_agent = request.headers.get('User-Agent', '')
    
    if not accept_language:
        accept_language = request.headers.get('Accept-Language', '')
    
    # Parse user agent for detailed info
    parsed_ua = parse(user_agent)
    
    # Core fingerprint components
    fingerprint_data = {
        'browser_family': parsed_ua.browser.family,
        'browser_version': f"{parsed_ua.browser.version[0]}.{parsed_ua.browser.version[1]}" if len(parsed_ua.browser.version) >= 2 else str(parsed_ua.browser.version[0]) if parsed_ua.browser.version else 'unknown',
        'os_family': parsed_ua.os.family,
        'os_version': f"{parsed_ua.os.version[0]}.{parsed_ua.os.version[1]}" if len(parsed_ua.os.version) >= 2 else str(parsed_ua.os.version[0]) if parsed_ua.os.version else 'unknown',
        'device_family': parsed_ua.device.family,
        'is_mobile': parsed_ua.is_mobile,
        'is_tablet': parsed_ua.is_tablet,
        'is_pc': parsed_ua.is_pc,
        'accept_language': accept_language[:10] if accept_language else '',  # First 10 chars to avoid too much specificity
    }
    
    # Add any additional data provided by frontend
    if additional_data:
        # Screen resolution, timezone, etc. from frontend JavaScript
        if isinstance(additional_data, dict):
            fingerprint_data.update({
                'screen_width': additional_data.get('screen_width'),
                'screen_height': additional_data.get('screen_height'),
                'timezone': additional_data.get('timezone'),
                'color_depth': additional_data.get('color_depth'),
                'pixel_ratio': additional_data.get('pixel_ratio'),
            })
    
    # Create deterministic hash
    fingerprint_string = json.dumps(fingerprint_data, sort_keys=True)
    device_id = hashlib.sha256(fingerprint_string.encode()).hexdigest()[:32]
    
    return device_id, fingerprint_data

def get_device_info(user_agent=None, ip_address=None):
    """
    Extract human-readable device information
    """
    if not user_agent:
        user_agent = request.headers.get('User-Agent', '')
    
    if not ip_address:
        ip_address = get_client_ip()
    
    parsed_ua = parse(user_agent)
    
    # Generate friendly device name
    device_name = f"{parsed_ua.browser.family}"
    if parsed_ua.os.family and parsed_ua.os.family != 'Other':
        device_name += f" on {parsed_ua.os.family}"
    
    if parsed_ua.device.family and parsed_ua.device.family != 'Other':
        device_name = f"{parsed_ua.device.family} - {device_name}"
    
    return {
        'name': device_name,
        'browser': {
            'name': parsed_ua.browser.family,
            'version': str(parsed_ua.browser.version) if parsed_ua.browser.version else 'Unknown'
        },
        'os': {
            'name': parsed_ua.os.family,
            'version': str(parsed_ua.os.version) if parsed_ua.os.version else 'Unknown'
        },
        'device': {
            'family': parsed_ua.device.family,
            'brand': parsed_ua.device.brand,
            'model': parsed_ua.device.model
        },
        'type': 'mobile' if parsed_ua.is_mobile else 'tablet' if parsed_ua.is_tablet else 'desktop',
        'is_mobile': parsed_ua.is_mobile,
        'is_tablet': parsed_ua.is_tablet,
        'is_pc': parsed_ua.is_pc,
        'ip_address': ip_address
    }

def get_client_ip():
    """
    Get the real client IP address, handling proxies and load balancers
    """
    # Check for forwarded IP first (from load balancers, proxies)
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, client IP is first
        return forwarded_for.split(',')[0].strip()
    
    # Check other common headers
    real_ip = request.headers.get('X-Real-IP')
    if real_ip:
        return real_ip
    
    # Fall back to direct connection
    return request.remote_addr

def generate_frontend_fingerprint_script():
    """
    Generate JavaScript code for frontend fingerprinting
    This collects additional browser characteristics that aren't available server-side
    """
    return """
    function generateDeviceFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
        
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
            web_gl_vendor: (() => {
                try {
                    const canvas = document.createElement('canvas');
                    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                    return gl ? gl.getParameter(gl.VENDOR) : null;
                } catch (e) {
                    return null;
                }
            })(),
            touch_support: 'ontouchstart' in window,
            max_touch_points: navigator.maxTouchPoints || 0
        };
    }
    
    // Make available globally
    window.generateDeviceFingerprint = generateDeviceFingerprint;
    """

def create_device_session_token(device_id, user_id, session_data=None):
    """
    Create a device-specific session token that can be used for
    additional security verification
    """
    import time
    
    token_data = {
        'device_id': device_id,
        'user_id': user_id,
        'timestamp': int(time.time()),
        'session_data': session_data or {}
    }
    
    token_string = json.dumps(token_data, sort_keys=True)
    return hashlib.sha256(token_string.encode()).hexdigest()[:16]

def is_device_fingerprint_similar(fingerprint1, fingerprint2, similarity_threshold=0.8):
    """
    Check if two device fingerprints are similar enough to be considered the same device
    Useful for handling minor browser updates or setting changes
    """
    if not fingerprint1 or not fingerprint2:
        return False
    
    # Compare key components
    key_components = [
        'browser_family', 'os_family', 'device_family', 
        'is_mobile', 'is_tablet', 'is_pc'
    ]
    
    matches = 0
    total = len(key_components)
    
    for component in key_components:
        if fingerprint1.get(component) == fingerprint2.get(component):
            matches += 1
    
    similarity = matches / total
    return similarity >= similarity_threshold