import { InputHTMLAttributes, forwardRef } from 'react';

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  checked?: boolean;
}

// 霓虹风格切换开关样式 - 确保高对比度
export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ label, checked = false, className = '', id, onChange, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium font-body text-text-primary cursor-pointer">
            {label}
          </label>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => {
            if (onChange) {
              const event = {
                target: { checked: !checked },
              } as React.ChangeEvent<HTMLInputElement>;
              onChange(event);
            }
          }}
          className={`
            relative inline-flex h-6 w-11
            shrink-0 cursor-pointer
            rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            ${checked ? 'bg-accent-primary' : 'bg-border-default'}
            ${className}
          `.trim()}
          disabled={props.disabled}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5
              transform rounded-full bg-white shadow-lg
              transition duration-200 ease-in-out
              ${checked ? 'translate-x-5' : 'translate-x-0'}
            `.trim()}
          />
        </button>
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
          {...props}
        />
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export default Toggle;
