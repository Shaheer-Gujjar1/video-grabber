import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel?: () => void;
  type?: 'warning' | 'info' | 'danger';
}

const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  type = 'info'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md p-10 glass-card rounded-[2.5rem] border border-white/20 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
        <div className="absolute top-8 right-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="rounded-full h-10 w-10 bg-white/5 hover:bg-white/10 text-white/70"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${
              type === 'danger' ? 'bg-destructive/20 text-destructive' : 
              type === 'warning' ? 'bg-amber-500/20 text-amber-500' : 
              'bg-primary/20 text-primary'
            }`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white leading-tight">
              {title}
            </h2>
          </div>

          <p className="text-white/70 leading-relaxed font-body">
            {description}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              onClick={onConfirm}
              className={`flex-1 h-14 rounded-2xl font-bold text-white ${
                type === 'danger' ? 'neon-btn-destructive' : 'neon-btn'
              }`}
            >
              {confirmLabel}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel || onClose}
              className="flex-1 h-14 rounded-2xl font-bold neon-btn"
            >
              {cancelLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
