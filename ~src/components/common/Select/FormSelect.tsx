import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

interface Option {
    value: string;
    label: string;
}

interface FormSelectProps {
    label?: string;
    value?: string;
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    error?: boolean;
    helperText?: string;
    className?: string;
    disabled?: boolean;
    startIcon?: React.ReactNode;
}

const FormSelect = forwardRef<HTMLButtonElement, FormSelectProps>(
    ({ label, value, options, onChange, placeholder = "Select option", error, helperText, className, disabled, startIcon }, ref) => {
        const selectedOption = options.find((opt) => opt.value === value);
        const selectId = label ? `select-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined;

        return (
            <div className="mb-2 relative group">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-[10px] sm:text-[11px] font-black text-foreground-tertiary mb-1 uppercase tracking-widest px-1"
                    >
                        {label}
                    </label>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={disabled}>
                        <button
                            ref={ref}
                            id={selectId}
                            type="button"
                            className={cn(
                                "w-full flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 text-sm sm:text-base border rounded-xl sm:rounded-[1.25rem] bg-surface/50 backdrop-blur-md transition-all duration-300 outline-none text-left",
                                "focus:ring-2 sm:focus:ring-4 focus:ring-primary/10 focus:border-primary focus:shadow-lg sm:focus:shadow-xl",
                                error ? "border-error focus:ring-error" : "border-border hover:border-primary/40",
                                disabled && "opacity-50 cursor-not-allowed",
                                className
                            )}
                        >
                            <div className="flex items-center gap-3 truncate">
                                {startIcon && <div className="text-primary opacity-50 group-focus-within:opacity-100 transition-opacity">{startIcon}</div>}
                                <span className={cn("truncate", !selectedOption && "text-foreground-tertiary")}>
                                    {selectedOption ? selectedOption.label : placeholder}
                                </span>
                            </div>
                            <ChevronDown className={cn("w-4 h-4 sm:w-5 sm:h-5 text-foreground-tertiary group-focus-within:text-primary transition-colors", disabled && "opacity-50")} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-auto z-[60]">
                        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
                            {options.map((option) => (
                                <DropdownMenuRadioItem key={option.value} value={option.value}>
                                    {option.label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
                {helperText && (
                    <p className={cn("mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium sm:font-bold px-1", error ? "text-error" : "text-foreground-tertiary")}>
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

FormSelect.displayName = "FormSelect";

export default FormSelect;
