import React from 'react';
import { XMarkIcon } from '../icons/IconComponents';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm p-4"> {/* Increased backdrop opacity */}
      <div className={`bg-base-200 rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}> {/* Changed bg-white to bg-base-200 */}
        <div className="flex items-center justify-between p-4 border-b border-base-300"> {/* Use theme border */}
          {title && <h3 className="text-lg font-semibold text-content">{title}</h3>}
          <button
            onClick={onClose}
            className="text-neutral hover:text-content transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};