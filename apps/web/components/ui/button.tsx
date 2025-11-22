import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-purple disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-electric-purple text-white hover:bg-electric-purple/90 shadow-glow-purple hover:scale-105 active:scale-95",
        success: "bg-neon-green text-black hover:bg-neon-green/90 shadow-glow-green hover:scale-105 active:scale-95",
        danger: "bg-blood-red text-white hover:bg-blood-red/90 hover:scale-105 active:scale-95",
        secondary: "bg-medium-gray text-white border border-light-gray hover:bg-light-gray/20 hover:scale-105 active:scale-95",
        ghost: "hover:bg-medium-gray hover:text-white",
        link: "text-electric-purple underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

