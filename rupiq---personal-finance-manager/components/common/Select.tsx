import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
  containerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({ label, id, error, options, className = '', containerClassName = '', ...props }) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && <label htmlFor={selectId} className="block text-sm font-medium text-content-secondary mb-1">{label}</label>}
      <select
        id={selectId}
        className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 sm:text-sm 
                   bg-base-300 border-neutral text-content 
                   focus:ring-primary focus:border-primary 
                   disabled:bg-base-200 disabled:text-neutral disabled:border-neutral/50 disabled:cursor-not-allowed
                   ${error ? 'border-red-500 focus:ring-red-500' : 'border-neutral'} ${className}`}
        {...props}
      >
        <option value="" disabled={props.defaultValue === undefined || props.value === ""} className="bg-base-300 text-content-secondary">Select {label || 'an option'}</option>
        {options.map(option => (
          <option key={option.value} value={option.value} className="bg-base-300 text-content">{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};