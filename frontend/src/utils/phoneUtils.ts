/**
 * Indian Mobile Phone Number Validation & Normalization Utility
 * Validates TRAI 10-digit mobile allocations (prefixes 6, 7, 8, 9)
 * Normalizes input with/without +91, 0, spaces, and hyphens into canonical format.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalizedE164: string; // e.g. "+919515159006"
  whatsappDigits: string; // e.g. "919515159006"
  displayPhone: string;   // e.g. "+91 95151 59006"
  errorMessage?: string;
}

export function validateAndNormalizeIndianPhone(phoneInput?: string | null): PhoneValidationResult {
  if (!phoneInput || !phoneInput.trim()) {
    return {
      isValid: false,
      normalizedE164: '',
      whatsappDigits: '',
      displayPhone: '',
      errorMessage: 'Phone number is required.',
    };
  }

  const digits = phoneInput.replace(/\D/g, '');
  let mobileDigits = '';

  if (digits.length === 10) {
    mobileDigits = digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    mobileDigits = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    mobileDigits = digits.slice(2);
  } else {
    return {
      isValid: false,
      normalizedE164: '',
      whatsappDigits: '',
      displayPhone: phoneInput,
      errorMessage: `Invalid length (${digits.length} digits). Please enter a 10-digit Indian mobile number.`,
    };
  }

  // First digit must be 6, 7, 8, or 9
  if (!['6', '7', '8', '9'].includes(mobileDigits[0])) {
    return {
      isValid: false,
      normalizedE164: '',
      whatsappDigits: '',
      displayPhone: phoneInput,
      errorMessage: `Invalid starting digit '${mobileDigits[0]}'. Indian mobile numbers must start with 6, 7, 8, or 9.`,
    };
  }

  const normalizedE164 = `+91${mobileDigits}`;
  const whatsappDigits = `91${mobileDigits}`;
  const displayPhone = `+91 ${mobileDigits.slice(0, 5)} ${mobileDigits.slice(5)}`;

  return {
    isValid: true,
    normalizedE164,
    whatsappDigits,
    displayPhone,
  };
}

