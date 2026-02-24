import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

// 霓虹风格输入框样式 - 确保高对比度
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
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
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2
            border border-border-default rounded-lg
            bg-background-elevated text-text-primary placeholder:text-text-muted
            focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            ${error ? 'border-accent-tertiary' : ''}
            ${className}
          `.trim()}
          {...props}
        />
        {error && <p className="mt-1 text-sm font-body text-accent-tertiary">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm font-body text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
