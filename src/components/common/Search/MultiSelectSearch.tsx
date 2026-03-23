import React, { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../../../lib/utils";

interface Option {
    value: string;
    label: string;
}

interface MultiSelectSearchProps {
    options: Option[];
    selectedValues: string[];
    onSelectionChange: (selectedValues: string[]) => void;
    placeholder?: string;
    className?: string;
    allowAll?: boolean;
    isLoading?: boolean;
    allowSearch?: boolean;
}

const MultiSelectSearch: React.FC<MultiSelectSearchProps> = ({
    options,
    selectedValues,
    onSelectionChange,
    placeholder = "Select...",
    className,
    allowAll = true,
    allowSearch,
    isLoading = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isAllSelected = selectedValues.includes('all');

    const filteredOptions = options.filter((option) => {
        const label = option.label.toLowerCase();
        const isSelected = selectedValues.includes(option.value);
        return (
            label.includes(searchTerm.toLowerCase()) &&
            !isSelected &&
            option.value !== 'all'
        );
    });

    const handleSelect = (value: string) => {
        if (value === 'all') {
            onSelectionChange(['all']);
        } else {
            const newValues = [...selectedValues.filter(v => v !== 'all')];
            if (!newValues.includes(value)) {
                newValues.push(value);
            }
            onSelectionChange(newValues);
        }
        setSearchTerm("");
        setIsOpen(false);
    };

    const handleRemove = (value: string) => {
        let newValues = selectedValues.filter((v) => v !== value);
        if (newValues.length === 0 && allowAll) {
            newValues = ['all'];
        }
        onSelectionChange(newValues);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedObjects = isAllSelected
        ? [{ value: 'all', label: 'All' }]
        : options.filter((opt) => selectedValues.includes(opt.value));

    return (
        <div className={cn("relative group w-full", className)} ref={containerRef}>
            <div
                className={cn(
                    "flex flex-wrap gap-2 items-center min-h-[42px] px-3 py-1.5 bg-surface border border-border/50 rounded-2xl focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all cursor-text shadow-sm hover:border-primary/50",
                    isOpen && "border-primary ring-2 ring-primary"
                )}
                onClick={() => inputRef.current?.focus()}
            >
                {selectedObjects.map((opt) => (
                    <span
                        key={opt.value}
                        className="flex items-center gap-1.5 px-3 py-1 bg-muted/90 text-foreground text-[11px] font-bold rounded-xl border border-border/50 group/chip hover:bg-muted transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {opt.label}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemove(opt.value);
                            }}
                            className="text-foreground-tertiary hover:text-error transition-colors ml-0.5"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </span>
                ))}

                <div className="flex-1 flex items-center min-w-[80px]">
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={selectedValues.length === 0 ? placeholder : ""}
                        className="w-full bg-transparent border-none outline-none text-sm font-bold placeholder:text-foreground-tertiary focus:ring-0 px-1"
                    />
                </div>

                <div className="flex items-center gap-2 pl-2 border-l border-border/30">
                    {isLoading ? (
                        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    ) : (
                        allowSearch && <Search className="w-4 h-4 text-foreground-tertiary group-focus-within:text-primary transition-colors" />
                    )}
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface/90 border border-border/40 rounded-2xl shadow-2xl z-[100] max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
                    <div className="p-2 space-y-1">
                        {allowAll && !isAllSelected && "all".includes(searchTerm.toLowerCase()) && (
                            <button
                                onClick={() => handleSelect('all')}
                                className="w-full px-4 py-3 text-left hover:bg-primary/10 rounded-xl transition-all group/item flex items-center justify-between"
                            >
                                <div className="font-bold text-sm text-foreground group-hover/item:text-primary transition-colors">
                                    All
                                </div>
                                <div className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest opacity-0 group-hover/item:opacity-100 transition-opacity text-primary">
                                    Select
                                </div>
                            </button>
                        )}
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleSelect(opt.value)}
                                    className="w-full px-4 py-3 text-left hover:bg-primary/10 rounded-xl transition-all group/item flex items-center justify-between"
                                >
                                    <div className="font-bold text-sm text-foreground group-hover/item:text-primary transition-colors">
                                        {opt.label}
                                    </div>
                                    <div className="text-[10px] font-black uppercase text-foreground-tertiary tracking-widest opacity-0 group-hover/item:opacity-100 transition-opacity text-primary">
                                        Select
                                    </div>
                                </button>
                            ))
                        ) : (
                            !allowAll || isAllSelected || !"all".includes(searchTerm.toLowerCase()) ? (
                                <div className="p-8 text-xs font-bold text-foreground-tertiary text-center flex flex-col items-center gap-2">
                                    <Search className="w-8 h-8 opacity-10" />
                                    No results found for "{searchTerm}"
                                </div>
                            ) : null
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectSearch;
