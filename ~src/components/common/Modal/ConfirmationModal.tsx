import React from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import Button from '../Button/Button';
import { cn } from '../../../lib/utils';

interface ConfirmationModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'info' | 'success';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
}) => {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            maxWidth="sm"
            actions={
                <>
                    <Button variant="outline" onClick={onClose}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={
                            variant === 'danger' ? 'destructive' :
                                variant === 'success' ? 'default' : 'default'
                        }
                        className={cn(
                            variant === 'success' && "bg-success hover:bg-success/90 text-white border-none"
                        )}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <div className={cn(
                        "p-3 rounded-2xl flex-shrink-0",
                        variant === 'danger' ? "bg-error/10 text-error" :
                            variant === 'success' ? "bg-success/10 text-success" : "bg-info/10 text-info"
                    )}>
                        {variant === 'danger' ? (
                            <AlertTriangle className="w-6 h-6" />
                        ) : variant === 'success' ? (
                            <CheckCircle2 className="w-6 h-6" />
                        ) : (
                            <Info className="w-6 h-6" />
                        )}
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm text-foreground-secondary leading-relaxed font-medium">
                            {message}
                        </p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;
