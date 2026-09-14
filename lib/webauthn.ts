/**
 * WebAuthn / Passkey helper routines
 * Note: WebAuthn uses standard public key cryptography.
 * NO raw biometric data (fingerprint, face mesh) is ever exposed or stored.
 */

export const isWebAuthnSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );
};

export interface WebAuthnRegisterResult {
  credentialId: string;
  publicKey: string;
}

export interface WebAuthnAssertionData {
  credentialId: string;
  clientDataJSON: string; // base64url
  authenticatorData: string; // base64url
  signature: string; // base64url
  userHandle?: string | null;
  rawId: string;
}

/**
 * Convert ArrayBuffer or Uint8Array to base64url string
 */
export function bufferToBase64URL(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Safely decodes a base64url or base64 string to a Uint8Array
 */
export function base64URLToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.trim().replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Safely decodes a credential ID from either base64url, base64, or hex format
 */
export function decodeCredentialId(credentialId: string): Uint8Array {
  const clean = credentialId.trim();
  // Only treat as hex if it starts with 0x or is 120+ hex chars (such as uncompressed EC public keys)
  if (
    (clean.startsWith('0x') || clean.length >= 120) &&
    /^[0-9a-fA-F]+$/.test(clean.replace(/^0x/, '')) &&
    clean.length % 2 === 0
  ) {
    const hex = clean.replace(/^0x/, '');
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }
  return base64URLToBuffer(clean);
}

/**
 * Check if two credential IDs match (comparing raw bytes or normalized base64url)
 */
export function matchCredentialId(id1: string, id2: string): boolean {
  if (!id1 || !id2) return false;
  if (id1.trim() === id2.trim()) return true;
  try {
    const bytes1 = decodeCredentialId(id1);
    const bytes2 = decodeCredentialId(id2);
    if (bytes1.length !== bytes2.length) return false;
    for (let i = 0; i < bytes1.length; i++) {
      if (bytes1[i] !== bytes2[i]) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export const registerWebAuthnPasskey = async (
  studentRollNumber: string,
  studentName: string
): Promise<WebAuthnRegisterResult> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn / Passkeys are not supported on this browser or device.');
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new TextEncoder().encode(studentRollNumber);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge as unknown as BufferSource,
      rp: {
        name: 'Hostel Attendance System',
        id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
      },
      user: {
        id: userId as unknown as BufferSource,
        name: studentRollNumber,
        displayName: studentName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Touch ID / Face ID / Windows Hello
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('Biometric passkey creation was cancelled.');
    }

    const rawIdHex = Array.from(new Uint8Array(credential.rawId))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const credentialId = credential.id || bufferToBase64URL(credential.rawId);

    return {
      credentialId,
      publicKey: rawIdHex,
    };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Biometric registration timed out or was cancelled by user.');
    }
    throw new Error(err.message || 'WebAuthn passkey registration failed.');
  }
};

/**
 * Executes genuine WebAuthn authentication ceremony with the device authenticator
 * and validates the returned assertion.
 */
export const authenticateWithWebAuthn = async (
  registeredCredentialId: string,
  serverChallenge?: string
): Promise<WebAuthnAssertionData> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn / Passkeys are not supported on this device.');
  }

  if (!registeredCredentialId || !registeredCredentialId.trim()) {
    throw new Error('No registered credential ID provided for WebAuthn authentication.');
  }

  let challengeBytes: Uint8Array;
  if (serverChallenge) {
    try {
      challengeBytes = decodeCredentialId(serverChallenge);
    } catch {
      challengeBytes = new Uint8Array(32);
      window.crypto.getRandomValues(challengeBytes);
    }
  } else {
    challengeBytes = new Uint8Array(32);
    window.crypto.getRandomValues(challengeBytes);
  }

  let credBytes: Uint8Array;
  try {
    credBytes = decodeCredentialId(registeredCredentialId);
  } catch (e: any) {
    throw new Error(`Failed to decode registered credential ID: ${e.message}`);
  }

  const allowCredentials: PublicKeyCredentialDescriptor[] = [
    {
      id: credBytes as unknown as BufferSource,
      type: 'public-key',
    },
  ];

  const options: PublicKeyCredentialRequestOptions = {
    challenge: challengeBytes as unknown as BufferSource,
    timeout: 60000,
    userVerification: 'required',
    allowCredentials,
    rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
  };

  let assertion: PublicKeyCredential | null = null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: options,
    })) as PublicKeyCredential | null;
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Biometric passkey prompt was cancelled or verification failed.');
    }
    if (err.name === 'InvalidStateError') {
      throw new Error('The registered passkey was not recognized by this device.');
    }
    if (err.name === 'AbortError') {
      throw new Error('Biometric authentication ceremony was aborted.');
    }
    if (err.name === 'SecurityError') {
      throw new Error('WebAuthn security error. Check domain and HTTPS configuration.');
    }
    throw new Error(err.message || 'WebAuthn biometric authentication failed on device.');
  }

  if (!assertion) {
    throw new Error('Biometric authentication did not return a valid credential assertion.');
  }

  // Verify that the returned assertion matches the registered credential
  const returnedId = assertion.id || bufferToBase64URL(assertion.rawId);
  if (!matchCredentialId(returnedId, registeredCredentialId)) {
    throw new Error(
      'WebAuthn credential mismatch. The returned passkey does not match the student’s registered credential.'
    );
  }

  const response = assertion.response as AuthenticatorAssertionResponse;
  if (!response || !response.clientDataJSON || !response.authenticatorData || !response.signature) {
    throw new Error('Malformed WebAuthn assertion response received from device.');
  }

  const rawIdHex = Array.from(new Uint8Array(assertion.rawId))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    credentialId: returnedId,
    clientDataJSON: bufferToBase64URL(response.clientDataJSON),
    authenticatorData: bufferToBase64URL(response.authenticatorData),
    signature: bufferToBase64URL(response.signature),
    userHandle: response.userHandle ? bufferToBase64URL(response.userHandle) : null,
    rawId: rawIdHex,
  };
};

/**
 * Validates the WebAuthn assertion cryptographically against the backend verification endpoint.
 */
export const verifyWebAuthnAssertion = async (
  rollNumber: string,
  assertion: WebAuthnAssertionData,
  expectedChallenge?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/auth/webauthn/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNumber, assertion, expectedChallenge }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return {
        success: false,
        error: data.error || 'Server verification rejected passkey assertion.',
      };
    }
    return {
      success: false,
      error: 'WebAuthn verification must be performed in a browser environment.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Assertion verification failed.',
    };
  }
};

/**
 * Standard verifyWebAuthnPasskey routine for backward compatibility (e.g. submit attendance).
 * NEVER returns fake true on errors.
 */
export const verifyWebAuthnPasskey = async (
  credentialId?: string
): Promise<boolean> => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn / Passkeys are not supported on this device.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  let allowCredentials: PublicKeyCredentialDescriptor[] = [];
  if (credentialId && credentialId.trim()) {
    try {
      allowCredentials = [
        {
          id: decodeCredentialId(credentialId) as unknown as BufferSource,
          type: 'public-key',
        },
      ];
    } catch {
      allowCredentials = [];
    }
  }

  const options: PublicKeyCredentialRequestOptions = {
    challenge: challenge as unknown as BufferSource,
    timeout: 60000,
    userVerification: 'required',
    ...(allowCredentials.length > 0 ? { allowCredentials } : {}),
  };

  try {
    const assertion = (await navigator.credentials.get({
      publicKey: options,
    })) as PublicKeyCredential | null;

    if (!assertion) {
      throw new Error('Biometric passkey ceremony was not completed.');
    }

    if (credentialId && credentialId.trim()) {
      const returnedId = assertion.id || bufferToBase64URL(assertion.rawId);
      if (!matchCredentialId(returnedId, credentialId)) {
        throw new Error('WebAuthn assertion credential does not match the registered credential.');
      }
    }

    return true;
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Passkey authentication was cancelled or failed verification.');
    }
    throw new Error(err.message || 'WebAuthn authentication failed.');
  }
};
