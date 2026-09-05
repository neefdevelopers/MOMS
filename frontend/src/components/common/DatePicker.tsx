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
        <label className="text-[11px] font-semibold text-gray-400 mb-1 flex items-center gap-1">
          <CalendarIcon className="w-3 h-3 text-indigo-400" />
          {label}
        </label>
      )}
      <div
        onClick={handleOpenPicker}
        className={`group relative flex items-center bg-gray-900 border border-gray-700 hover:border-indigo-500/70 focus-within:border-indigo-500 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-950' : ''
        }`}
      >
        <CalendarIcon className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 mr-2 shrink-0 transition-colors" />
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
          className={`bg-transparent text-white text-xs focus:outline-none w-full cursor-pointer placeholder-gray-500 ${inputClassName}`}
          {...rest}
        />
        {allowClear && value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="ml-1.5 p-0.5 text-gray-500 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
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
