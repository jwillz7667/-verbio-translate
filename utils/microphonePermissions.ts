/**
 * Utility functions for handling microphone permissions
 */

export interface PermissionResult {
  granted: boolean;
  error?: string;
  needsManualEnable?: boolean;
}

/**
 * Check current microphone permission status
 */
export async function checkMicrophonePermission(): Promise<PermissionResult> {
  try {
    // Check if the browser supports permissions API
    if (!navigator.permissions) {
      return { granted: false, error: 'Permission API not supported', needsManualEnable: true };
    }

    const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    
    switch (permission.state) {
      case 'granted':
        return { granted: true };
      case 'denied':
        return { granted: false, error: 'Microphone access denied', needsManualEnable: true };
      case 'prompt':
        return { granted: false, error: 'Microphone permission not yet granted' };
      default:
        return { granted: false, error: 'Unknown permission state' };
    }
  } catch (error) {
    console.warn('Permission check failed:', error);
    return { granted: false, error: 'Permission check failed' };
  }
}

/**
 * Request microphone permission by attempting to access the microphone
 */
export async function requestMicrophonePermission(): Promise<PermissionResult> {
  try {
    // First check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        granted: false,
        error: 'Microphone not supported in this browser',
        needsManualEnable: true
      };
    }

    // Request access to microphone - this will trigger permission prompt
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    // If we got the stream, permission was granted - clean up immediately
    stream.getTracks().forEach(track => track.stop());
    
    return { granted: true };

  } catch (error: any) {
    console.error('Microphone permission request failed:', error);

    // Handle specific error types
    if (error.name === 'NotAllowedError') {
      return {
        granted: false,
        error: 'Microphone permission denied. Please click the microphone icon in your browser\'s address bar and allow access.',
        needsManualEnable: true
      };
    } else if (error.name === 'NotFoundError') {
      return {
        granted: false,
        error: 'No microphone found. Please connect a microphone and try again.',
        needsManualEnable: false
      };
    } else if (error.name === 'NotSupportedError') {
      return {
        granted: false,
        error: 'Microphone not supported in this browser. Please try Chrome, Firefox, or Safari.',
        needsManualEnable: true
      };
    } else if (error.name === 'SecurityError') {
      return {
        granted: false,
        error: 'Microphone access blocked by security policy. Please use HTTPS or localhost.',
        needsManualEnable: true
      };
    } else {
      return {
        granted: false,
        error: `Microphone access failed: ${error.message}`,
        needsManualEnable: true
      };
    }
  }
}

/**
 * Get user-friendly instructions for enabling microphone access
 */
export function getMicrophoneInstructions(userAgent: string = navigator.userAgent): string[] {
  const instructions: string[] = [];

  if (userAgent.includes('Chrome')) {
    instructions.push('Click the microphone icon 🎤 in the address bar');
    instructions.push('Select "Always allow" and click "Done"');
    instructions.push('Refresh the page and try again');
  } else if (userAgent.includes('Firefox')) {
    instructions.push('Click the microphone icon 🎤 in the address bar');
    instructions.push('Select "Allow" and uncheck "Remember this decision"');
    instructions.push('Try recording again');
  } else if (userAgent.includes('Safari')) {
    instructions.push('Go to Safari > Settings > Websites > Microphone');
    instructions.push('Set this website to "Allow"');
    instructions.push('Refresh the page and try again');
  } else if (userAgent.includes('Edge')) {
    instructions.push('Click the microphone icon 🎤 in the address bar');
    instructions.push('Select "Allow" from the dropdown');
    instructions.push('Try recording again');
  } else {
    instructions.push('Look for a microphone icon 🎤 in your browser\'s address bar');
    instructions.push('Click it and select "Allow" or "Always allow"');
    instructions.push('Refresh the page if needed and try again');
  }

  return instructions;
}

/**
 * Check if we're in a secure context (required for microphone access)
 */
export function isSecureContext(): boolean {
  return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
}