import { forwardRef } from 'react';

const variants = {
  primary: 'bg-[#10B981] text-white hover:bg-[#059669] active:scale-[0.98]',
  accent: 'bg-[#F97316] text-white hover:bg-[#ea580c] active:scale-[0.98]',
  danger: 'bg-[#EF4444] text-white hover:bg-[#dc2626] active:scale-[0.98]',
  outline: 'border-2 border-[#10B981] text-[#10B981] bg-transparent hover:bg-[#10B981]/10',
  ghost: 'text-gray-700 hover:bg-gray-100',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-base rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
  icon: 'p-2.5 rounded-xl',
};

export const Button = forwardRef(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center gap-2 font-medium
          transition-smooth disabled:opacity-50 disabled:pointer-events-none
          ${variants[variant] || variants.primary}
          ${sizes[size] || sizes.md}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
