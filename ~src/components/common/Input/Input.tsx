import { forwardRef } from "react";
import { cn } from "../../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: boolean;
  helperText?: string;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      startAdornment,
      endAdornment,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="mb-3 sm:mb-4">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {startAdornment && (
            <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-foreground-secondary">
              {startAdornment}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border rounded-xl sm:rounded-md transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
              "placeholder:text-foreground-tertiary",
              error
                ? "border-error focus:ring-error"
                : "border-border hover:border-foreground-secondary",
              startAdornment && "pl-8 sm:pl-10",
              endAdornment && "pr-8 sm:pr-10",
              className,
            )}
            {...props}
          />
          {endAdornment && (
            <div className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center">
              {endAdornment}
            </div>
          )}
        </div>
        {helperText && (
          <p
            className={cn(
              "mt-1 sm:mt-1.5 text-[10px] sm:text-xs",
              error ? "text-error" : "text-foreground-secondary",
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
