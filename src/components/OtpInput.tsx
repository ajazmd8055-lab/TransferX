import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Array of 6 digits derived from value
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        // Clear current box
        const newDigits = [...digits];
        newDigits[index] = '';
        const newValue = newDigits.join('').trimEnd();
        onChange(newValue);
      } else if (index > 0) {
        // Clear previous box and shift focus
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        const newValue = newDigits.join('').trimEnd();
        onChange(newValue);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const rawVal = e.target.value;

    // Filter only numeric characters
    const cleanDigits = rawVal.replace(/\D/g, '');
    if (!cleanDigits) {
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.join('').trimEnd());
      return;
    }

    // If single digit entered
    if (cleanDigits.length === 1) {
      const newDigits = [...digits];
      newDigits[index] = cleanDigits;
      const updatedCode = newDigits.join('');
      onChange(updatedCode);

      // Auto advance to next box
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
      if (updatedCode.length === 6 && onComplete) {
        onComplete(updatedCode);
      }
    } else {
      // If multiple digits (e.g. autofill or partial paste)
      handleMultiDigitFill(cleanDigits.slice(0, 6));
    }
  };

  const handleMultiDigitFill = (clean6Digits: string) => {
    const formatted = clean6Digits.slice(0, 6);
    onChange(formatted);
    const targetIdx = Math.min(formatted.length, 5);
    inputRefs.current[targetIdx]?.focus();
    if (formatted.length === 6 && onComplete) {
      onComplete(formatted);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const pastedText = e.clipboardData.getData('text');
    // Try to extract 6 digit code from text or URL (e.g. ?code=123456)
    const codeMatch = pastedText.match(/\b\d{6}\b/) || pastedText.replace(/\D/g, '').slice(0, 6);
    const cleanCode = typeof codeMatch === 'string' ? codeMatch : codeMatch?.[0] || '';

    if (cleanCode.length > 0) {
      handleMultiDigitFill(cleanCode);
    }
  };

  return (
    <div id="otp-input-container" className="flex items-center justify-center gap-2 sm:gap-2.5">
      {/* First 3 Digits */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {[0, 1, 2].map((index) => {
          const isFilled = Boolean(digits[index]);
          return (
            <input
              key={index}
              id={`otp-box-${index}`}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digits[index]}
              disabled={disabled}
              onChange={(e) => handleChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={`w-11 h-13 sm:w-12 sm:h-15 text-center text-2xl sm:text-3xl font-mono font-bold rounded-2xl outline-hidden transition-all select-none ${
                isFilled
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-400 dark:border-indigo-600 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-800'
              } focus:border-indigo-600 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/15 focus:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={`Digit ${index + 1}`}
            />
          );
        })}
      </div>

      {/* Elegant Dot Separator in App Color */}
      <div className="flex items-center justify-center px-0.5 sm:px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 dark:bg-indigo-400/50" />
      </div>

      {/* Second 3 Digits */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {[3, 4, 5].map((index) => {
          const isFilled = Boolean(digits[index]);
          return (
            <input
              key={index}
              id={`otp-box-${index}`}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digits[index]}
              disabled={disabled}
              onChange={(e) => handleChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={`w-11 h-13 sm:w-12 sm:h-15 text-center text-2xl sm:text-3xl font-mono font-bold rounded-2xl outline-hidden transition-all select-none ${
                isFilled
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-400 dark:border-indigo-600 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-800'
              } focus:border-indigo-600 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/15 focus:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={`Digit ${index + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
};
