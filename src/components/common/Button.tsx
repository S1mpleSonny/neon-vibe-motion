import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

// 霓虹风格按钮样式 - 确保高对比度
const variantStyles: Record<ButtonVariant, string> = {
  // Primary: 霓虹青色背景 + 黑色文字 (高对比度)
  primary: 'bg-accent-primary text-black hover:bg-accent-primary/90 disabled:opacity-50 shadow-neon-soft',
  // Secondary: 透明背景 + 霓虹边框 + 霓虹文字
  secondary: 'bg-transparent text-accent-primary border border-accent-primary hover:bg-accent-primary/10 disabled:opacity-50 disabled:border-accent-primary/30',
  // Ghost: 透明背景 + 浅色文字
  ghost: 'bg-transparent text-text-primary hover:bg-accent-primary/10 hover:text-accent-primary disabled:opacity-50 disabled:text-text-muted',
  // Danger: 霓虹粉色背景 + 白色文字
  danger: 'bg-accent-tertiary text-white hover:bg-accent-tertiary/90 disabled:opacity-50 shadow-neon-pink',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2 text-sm min-h-[40px]',
  lg: 'px-6 py-3 text-base min-h-[44px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center
          rounded-lg font-medium font-body
          transition-all duration-200 cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary
          disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `.trim()}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
