import { forwardRef } from 'react';

export const Input = forwardRef(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5
            text-gray-900 placeholder-gray-400
            focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20
            disabled:bg-gray-50 disabled:text-gray-500
            transition-smooth
            ${error ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-[#EF4444]">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
