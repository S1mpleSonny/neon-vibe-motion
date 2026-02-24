import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
}

// 霓虹风格选择器样式 - 确保高对比度
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      placeholder,
      className = '',
      id,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium font-body text-text-primary mb-1"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          value={value}
          onChange={onChange}
          className={`
            w-full px-3 py-2
            border border-border-default rounded-lg
            text-text-primary bg-background-elevated
            focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            ${error ? 'border-accent-tertiary' : ''}
            ${className}
          `.trim()}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm font-body text-accent-tertiary">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
