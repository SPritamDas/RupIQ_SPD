import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, error, className = '', containerClassName = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className={`mb-4 ${containerClassName}`}>
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-content-secondary mb-1">{label}</label>}
        <input
          id={inputId}
          ref={ref} // Pass the ref here
          className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 sm:text-sm 
                     bg-base-300 border-neutral text-content placeholder-content-secondary 
                     focus:ring-primary focus:border-primary 
                     disabled:bg-base-200 disabled:text-neutral disabled:border-neutral/50 disabled:cursor-not-allowed
                     ${error ? 'border-red-500 focus:ring-red-500' : 'border-neutral'} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input'; // Optional: for better debugging names in React DevTools


interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, id, error, className = '', containerClassName = '', ...props }) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && <label htmlFor={textareaId} className="block text-sm font-medium text-content-secondary mb-1">{label}</label>}
      <textarea
        id={textareaId}
        rows={3}
        className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 sm:text-sm 
                   bg-base-300 border-neutral text-content placeholder-content-secondary 
                   focus:ring-primary focus:border-primary 
                   disabled:bg-base-200 disabled:text-neutral disabled:border-neutral/50 disabled:cursor-not-allowed
                   ${error ? 'border-red-500 focus:ring-red-500' : 'border-neutral'} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};