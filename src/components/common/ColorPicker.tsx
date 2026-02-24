import { InputHTMLAttributes, forwardRef } from 'react';

interface ColorPickerProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  value?: string;
}

// 霓虹风格颜色选择器 - 确保高对比度
export const ColorPicker = forwardRef<HTMLInputElement, ColorPickerProps>(
  ({ label, value = '#000000', className = '', id, onChange, ...props }, ref) => {
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
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              ref={ref}
              id={inputId}
              type="color"
              value={value}
              onChange={onChange}
              className={`
                w-10 h-10
                border border-border-default rounded-lg cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-accent-primary
                disabled:opacity-50 disabled:cursor-not-allowed
                ${className}
              `.trim()}
              {...props}
            />
          </div>
          <span className="text-sm font-mono uppercase text-text-muted">
            {value}
          </span>
        </div>
      </div>
    );
  }
);

ColorPicker.displayName = 'ColorPicker';

export default ColorPicker;
