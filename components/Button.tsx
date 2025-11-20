import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  // Increased padding, text size, and added strong focus rings
  const baseStyles = "px-10 py-5 rounded-full font-bold text-xl transition-all duration-200 tracking-widest uppercase transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-offset-4 focus:ring-offset-black";
  
  const variants = {
    primary: "bg-gradient-to-r from-red-600 to-red-800 text-white shadow-[0_0_25px_rgba(220,38,38,0.5)] hover:shadow-[0_0_45px_rgba(220,38,38,0.7)] focus:ring-red-500 border border-red-500/20",
    secondary: "bg-zinc-900 border-2 border-zinc-600 text-zinc-200 hover:border-zinc-400 hover:text-white hover:bg-zinc-800 focus:ring-zinc-500",
    danger: "bg-zinc-950 text-red-500 border-2 border-red-900/50 hover:bg-red-950 focus:ring-red-900"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};