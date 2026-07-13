import { forwardRef } from "react";
import { cn } from "../../../lib/utils";

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: boolean;
    helperText?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    (
        {
            label,
            error,
            helperText,
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
                    <textarea
                        ref={ref}
                        id={inputId}
                        className={cn(
                            "w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border rounded-xl sm:rounded-md transition-all duration-200 min-h-[120px]",
                            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                            "placeholder:text-foreground-tertiary",
                            error
                                ? "border-error focus:ring-error"
                                : "border-border hover:border-foreground-secondary",
                            className,
                        )}
                        {...props}
                    />
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

TextArea.displayName = "TextArea";

export default TextArea;
