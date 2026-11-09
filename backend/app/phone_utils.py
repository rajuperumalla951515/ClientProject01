import re
from typing import Tuple, Optional

def validate_and_normalize_indian_phone(phone_input: Optional[str]) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validates and normalizes Indian mobile phone numbers.
    
    Accepted input formats:
      - 9876543210 (10 standard digits)
      - 09876543210 (11 digits with domestic trunk prefix '0')
      - 919876543210 (12 digits with country code '91')
      - +91 98765 43210 (Formatted with international prefix and spaces)
      - +91-9876543210 (Formatted with hyphens)
    
    Validation rules:
      - Strips all non-digit characters.
      - Resolves to exactly 10 mobile subscriber digits.
      - First subscriber digit must be 6, 7, 8, or 9 (TRAI / DoT mobile allocation).
      - Rejects landlines, invalid lengths, and non-Indian country formats.
    
    Returns:
      (is_valid: bool, normalized_e164: Optional[str], error_message: Optional[str])
      Example: (True, "+919515159006", None)
               (False, None, "Invalid length (8 digits). Indian mobile numbers must contain 10 digits.")
    """
    if not phone_input or not str(phone_input).strip():
        return False, None, "Phone number is required."

    raw = str(phone_input).strip()
    digits = re.sub(r"\D", "", raw)

    if len(digits) == 10:
        mobile_digits = digits
    elif len(digits) == 11 and digits.startswith("0"):
        mobile_digits = digits[1:]
    elif len(digits) == 12 and digits.startswith("91"):
        mobile_digits = digits[2:]
    else:
        return (
            False,
            None,
            f"Invalid length ({len(digits)} digits). Indian mobile numbers must contain 10 valid digits (with optional +91 or 0 prefix)."
        )

    # TRAI Mobile prefix verification (6, 7, 8, 9)
    if mobile_digits[0] not in ("6", "7", "8", "9"):
        return (
            False,
            None,
            f"Invalid mobile operator prefix '{mobile_digits[0]}'. Indian mobile numbers must start with 6, 7, 8, or 9."
        )

    normalized_e164 = f"+91{mobile_digits}"
    return True, normalized_e164, None


def get_whatsapp_number_digits(phone_input: Optional[str]) -> Optional[str]:
    """
    Returns 12-digit international number without '+' for WhatsApp click-to-chat URL (e.g. '919515159006').
    """
    valid, normalized, _ = validate_and_normalize_indian_phone(phone_input)
    if valid and normalized:
        return normalized.replace("+", "")
    return None


def format_display_indian_phone(phone_input: Optional[str]) -> str:
    """
    Formats phone for human display: '+91 95151 59006'
    """
    valid, normalized, _ = validate_and_normalize_indian_phone(phone_input)
    if not valid or not normalized:
        return phone_input or ""
    # +91 followed by 5 digits, space, 5 digits
    digits = normalized[3:]
    return f"+91 {digits[:5]} {digits[5:]}"

