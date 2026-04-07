import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'ocean';
  size?: 'sm' | 'md' | 'lg';
}

const VARIANTS = {
  primary:
    'bg-[#F26419] hover:bg-[#D9560E] text-white shadow-md hover:shadow-orange-300/40 shadow-orange-200/30',
  secondary:
    'bg-white hover:bg-[#F5E6C8] text-[#1A3352] border border-[#E2C99A] hover:border-[#D4B896]',
  ocean:
    'bg-[#0891B2] hover:bg-[#0E7490] text-white shadow-md shadow-sky-200/30',
  danger:
    'bg-red-500 hover:bg-red-600 text-white',
  ghost:
    'hover:bg-[#F5E6C8] text-[#2D4F7C] hover:text-[#1A3352]',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm rounded-xl',
  md: 'px-5 py-2.5 text-base rounded-2xl',
  lg: 'px-8 py-3.5 text-lg rounded-2xl font-semibold',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
        'disabled:opacity-40 disabled:cursor-not-allowed active:scale-95',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </button>
  );
}
