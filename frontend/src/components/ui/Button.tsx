import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0F17] disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-2 gap-2',
    lg: 'text-sm px-4 py-2.5 gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-sm shadow-blue-600/30',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 focus:ring-slate-500',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-sm shadow-rose-600/30',
    outline: 'border border-slate-700 hover:bg-slate-800 text-slate-300 focus:ring-slate-500',
    ghost: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 focus:ring-slate-500',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
