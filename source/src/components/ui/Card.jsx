export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm transition-smooth ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }) {
  return (
    <div className={`p-4 pb-0 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className = '', children, ...props }) {
  return (
    <div className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }) {
  return (
    <div className={`flex items-center p-4 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
}
