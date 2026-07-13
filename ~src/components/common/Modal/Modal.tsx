import React, { useEffect, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "../Button/Button";
import { cn } from "../../../lib/utils";

import { ModalContext } from "./ModalContext";

export const ModalFooter: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => {
  const context = useContext(ModalContext);

  // If not inside a ModalContext, render children normally in a container
  if (!context) {
    return (
      <div className={cn("mt-8 pt-6 border-t border-border", className)}>
        {children}
      </div>
    );
  }

  const { footerRef } = context;

  // If inside Modal but footer ref not ready, don't render yet
  if (!footerRef) return null;

  return createPortal(
    <div className={cn("flex items-center justify-end gap-3 w-full", className)}>
      {children}
    </div>,
    footerRef
  );
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
}

const maxWidthClasses = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl",
  xl: "max-w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl",
};


const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = "sm",
}) => {
  const [footerElement, setFooterElement] = useState<HTMLDivElement | null>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <ModalContext.Provider value={{ footerRef: footerElement }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal content */}
        <div
          className={cn(
            "relative bg-surface rounded-3xl shadow-2xl w-full mx-auto border border-white/20 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 z-10 overflow-hidden flex flex-col",
            maxWidthClasses[maxWidth],
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >

          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-5 border-b border-border bg-muted/30">
            <h2
              id="modal-title"
              className="text-base sm:text-lg lg:text-xl font-bold text-foreground tracking-tight pr-2"
            >
              {title}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-foreground-secondary hover:text-foreground hover:bg-muted transition-all duration-200 flex-shrink-0 h-auto w-auto"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar max-h-[calc(100vh-120px)] sm:max-h-[calc(100vh-180px)]">
            {children}
          </div>

          {/* Footer/Actions Slot */}
          <div
            ref={setFooterElement}
            className={cn(
              "flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30 empty:hidden",
              !actions && "empty:hidden"
            )}
          >
            {actions}
          </div>
        </div>
      </div>
    </ModalContext.Provider>
  );
};

export default Modal;


