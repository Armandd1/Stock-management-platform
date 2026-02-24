import React from 'react';
import { cn } from '../../utils/cn';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-title"
        className={cn("relative z-50 w-full max-w-lg rounded-xl bg-card text-card-foreground p-6 shadow-lg border border-border animate-in fade-in zoom-in-95 duration-200", className)}
      >
        <button 
          onClick={onClose} 
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 ring-offset-background transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        <div id="modal-title" className="mb-5 text-xl font-semibold tracking-tight">{title}</div>
        {children}
      </div>
    </div>
  );
};
