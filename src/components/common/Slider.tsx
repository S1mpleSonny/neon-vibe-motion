import { InputHTMLAttributes, forwardRef } from 'react';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  showValue?: boolean;
  unit?: string;
}

// 霓虹风格滑块组件 - 确保高对比度
export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      label,
      min = 0,
      max = 100,
      step = 1,
      value = 0,
      showValue = true,
      unit = '',
      className = '',
      id,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          {label && (
            <label
              htmlFor={inputId}
              className="text-sm font-medium font-body text-text-primary"
            >
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm font-mono text-text-muted">
              {value}
              {unit}
            </span>
          )}
        </div>
        <input
          ref={ref}
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          className={`
            w-full h-2
            bg-border-default rounded-lg
            appearance-none cursor-pointer
            accent-accent-primary
            focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `.trim()}
          {...props}
        />
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>
            {min}
            {unit}
          </span>
          <span>
            {max}
            {unit}
          </span>
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export default Slider;
