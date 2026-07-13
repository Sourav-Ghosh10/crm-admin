import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    wrapperClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChange,
    className,
    wrapperClassName,
    placeholder = 'Search...',
    ...props
}) => {
    return (
        <div className={cn("relative group", wrapperClassName)}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary group-focus-within:text-primary transition-colors" />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "w-full pl-12 pr-4 py-3 bg-surface border border-border/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm font-bold h-[42px]",
                    className
                )}
                {...props}
            />
        </div>
    );
};
