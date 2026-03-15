const variants = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-[#10B981]/15 text-[#10B981]',
  accent: 'bg-[#F97316]/15 text-[#F97316]',
  danger: 'bg-[#EF4444]/15 text-[#EF4444]',
};

export function Badge({ className = '', variant = 'default', children, ...props }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
