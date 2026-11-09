import React, { useState, useEffect } from 'react';
import {
  Phone, CheckCircle2, AlertCircle, Loader2, ShieldCheck,
  Send, RefreshCw, KeyRound, Info
} from 'lucide-react';
import { api } from '../services/api';
import { validateAndNormalizeIndianPhone, PhoneValidationResult } from '../utils/phoneUtils';

interface PhoneVerificationInputProps {
  value: string;
  onChange: (phone: string, isValid: boolean, isVerified: boolean) => void;
  isVerified?: boolean;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  className?: string;
}

export const PhoneVerificationInput: React.FC<PhoneVerificationInputProps> = ({
  value,
  onChange,
  isVerified = false,
  disabled = false,
  label = 'Mobile Phone Number',
  required = true,
  className = '',
}) => {
  const [internalPhone, setInternalPhone] = useState(value || '');
  const [validation, setValidation] = useState<PhoneValidationResult>(() =>
    validateAndNormalizeIndianPhone(value)
  );

  // OTP flow state
  const [isOtpStepActive, setIsOtpStepActive] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [providerAvailable, setProviderAvailable] = useState<boolean | null>(null);
  const [verifiedState, setVerifiedState] = useState(isVerified);

  // Resend cooldown timer
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (value !== internalPhone) {
      setInternalPhone(value);
      const res = validateAndNormalizeIndianPhone(value);
      setValidation(res);
      if (!value) {
        setVerifiedState(false);
      }
    }
  }, [value]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits, +, -, spaces
    const cleanChars = raw.replace(/[^\d+ -]/g, '');
    setInternalPhone(cleanChars);

    const result = validateAndNormalizeIndianPhone(cleanChars);
    setValidation(result);

    // If phone number changes after being verified, reset verified state
    const isNowVerified = cleanChars === value ? verifiedState : false;
    if (cleanChars !== value) {
      setVerifiedState(false);
      setIsOtpStepActive(false);
      setStatusMessage(null);
    }

    onChange(
      result.isValid ? result.normalizedE164 : cleanChars,
      result.isValid,
      isNowVerified
    );
  };

  const handleSendOtp = async () => {
    if (!validation.isValid || !validation.normalizedE164) {
      setStatusMessage({
        type: 'error',
        text: validation.errorMessage || 'Please enter a valid 10-digit Indian mobile number.',
      });
      return;
    }

    setIsSendingOtp(true);
    setStatusMessage(null);

    try {
      const res = await api.sendPhoneOtp(validation.normalizedE164);
      setProviderAvailable(res.provider_configured);

      if (!res.provider_configured) {
        // Provider is not configured - notify user honestly without false claims
        setStatusMessage({
          type: 'info',
          text: 'SMS OTP verification gateway is currently not configured by store admin. You can proceed with ordering directly via WhatsApp.',
        });
        setIsOtpStepActive(false);
      } else {
        setIsOtpStepActive(true);
        setCooldown(res.cooldown_seconds || 60);
        let msg = res.message || 'OTP sent successfully to your mobile number.';
        if (res.dev_otp) {
          msg += ` (Demo OTP: ${res.dev_otp})`;
        }
        setStatusMessage({ type: 'success', text: msg });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to dispatch verification code. Please try again.',
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setStatusMessage({ type: 'error', text: 'Please enter the 6-digit numeric OTP code.' });
      return;
    }

    setIsVerifyingOtp(true);
    setStatusMessage(null);

    try {
      const res = await api.verifyPhoneOtp(validation.normalizedE164, cleanOtp);
      if (res.is_verified) {
        setVerifiedState(true);
        setIsOtpStepActive(false);
        setOtpCode('');
        setStatusMessage({
          type: 'success',
          text: 'Phone number verified successfully!',
        });
        onChange(validation.normalizedE164, true, true);
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Invalid or expired OTP code.' });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Verification failed. Please check the OTP code and retry.',
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label & Status Pill */}
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-stone-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {verifiedState ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Verified Phone
          </span>
        ) : validation.isValid ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
            Valid Format (+91)
          </span>
        ) : null}
      </div>

      {/* Main Input Row */}
      <div className="relative flex items-center rounded-xl border border-stone-200 bg-white overflow-hidden focus-within:border-rootly-forest focus-within:ring-1 focus-within:ring-rootly-forest/20 transition-all">
        {/* Country Badge */}
        <div className="flex items-center gap-1 px-3 py-2.5 bg-stone-50 border-r border-stone-200 text-stone-600 text-xs font-bold shrink-0 select-none">
          <span className="text-sm">🇮🇳</span>
          <span>+91</span>
        </div>

        {/* Input */}
        <input
          type="tel"
          disabled={disabled || verifiedState}
          value={internalPhone.replace(/^\+91\s?/, '')}
          onChange={handlePhoneChange}
          placeholder="10-digit mobile (e.g. 95151 59006)"
          className="w-full px-3 py-2.5 text-xs font-semibold text-stone-900 placeholder:text-stone-400 bg-transparent focus:outline-none disabled:bg-stone-50 disabled:text-stone-500"
        />

        {/* Action button inside input */}
        {validation.isValid && !verifiedState && !isOtpStepActive && (
          <div className="pr-1.5 shrink-0">
            <button
              type="button"
              disabled={isSendingOtp}
              onClick={handleSendOtp}
              className="px-2.5 py-1.5 rounded-lg bg-rootly-forest hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 transition-colors disabled:opacity-60"
            >
              {isSendingOtp ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verify OTP</span>
                </>
              )}
            </button>
          </div>
        )}

        {verifiedState && (
          <div className="pr-3 text-emerald-600 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* OTP Entry Box */}
      {isOtpStepActive && !verifiedState && (
        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-bold text-stone-800">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-rootly-forest" />
              <span>Enter 6-Digit OTP</span>
            </span>
            <span className="text-[11px] font-normal text-stone-500">
              Sent to {validation.displayPhone}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              className="w-36 px-3 py-2 rounded-lg border border-stone-300 text-center font-mono text-sm tracking-widest font-black focus:outline-none focus:border-rootly-forest"
            />

            <button
              type="button"
              disabled={isVerifyingOtp || otpCode.length !== 6}
              onClick={handleVerifyOtp}
              className="px-3 py-2 rounded-lg bg-rootly-forest hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              {isVerifyingOtp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Confirm</span>
              )}
            </button>

            <button
              type="button"
              disabled={cooldown > 0 || isSendingOtp}
              onClick={handleSendOtp}
              className="px-2.5 py-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-stone-900 font-semibold text-[11px] flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${cooldown > 0 ? '' : 'text-rootly-forest'}`} />
              <span>{cooldown > 0 ? `${cooldown}s` : 'Resend'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-2.5 rounded-xl text-[11px] font-medium flex items-start gap-1.5 ${
            statusMessage.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-stone-50 text-stone-700 border border-stone-200'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
          ) : statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Validation formatting tip */}
      {!validation.isValid && internalPhone.replace(/\D/g, '').length > 0 && (
        <p className="text-[11px] text-amber-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{validation.errorMessage}</span>
        </p>
      )}
    </div>
  );
};
