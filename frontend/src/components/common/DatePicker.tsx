import React, { useRef } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';

interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allowClear?: boolean;
  className?: string;
  inputClassName?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  allowClear = false,
  className = '',
  inputClassName = '',
  disabled,
  placeholder,
  ...rest
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenPicker = () => {
    if (disabled) return;
    try {
      if (inputRef.current && typeof inputRef.current.showPicker === 'function') {
        inputRef.current.showPicker();
      } else {
        inputRef.current?.focus();
      }
    } catch (e) {
      inputRef.current?.focus();
    }
  };

  return (
    <div className={`relative inline-flex flex-col ${className}`}>
      {label && (
        <label className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
          <CalendarIcon className="w-3 h-3 text-blue-600" />
          {label}
        </label>
      )}
      <div
        onClick={handleOpenPicker}
        className={`group relative flex items-center bg-white border border-slate-300 hover:border-blue-500 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer shadow-xs ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
        }`}
      >
        <CalendarIcon className="w-4 h-4 text-blue-600 group-hover:text-blue-700 mr-2 shrink-0 transition-colors" />
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenPicker();
          }}
          disabled={disabled}
          placeholder={placeholder}
          className={`bg-transparent text-slate-900 text-xs focus:outline-none w-full cursor-pointer placeholder-slate-400 ${inputClassName}`}
          {...rest}
        />
        {allowClear && value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="ml-1.5 p-0.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            title="Clear Date"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default DatePicker;
