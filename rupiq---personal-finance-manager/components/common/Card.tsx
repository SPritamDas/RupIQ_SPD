import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '', titleClassName = '', actions }) => {
  return (
    <div className={`bg-base-200 shadow-lg rounded-xl p-6 ${className}`}> {/* Changed bg-white to bg-base-200 */}
      {title && (
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-xl font-semibold text-content ${titleClassName}`}>{title}</h3>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

export const StatCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon?: React.ReactNode; 
  color?: string; 
  description?: string;
  titleAction?: React.ReactNode;
  footerAction?: React.ReactNode; // Added new prop
}> = ({ title, value, icon, color = 'text-primary', description, titleAction, footerAction }) => (
  <Card className="transform hover:scale-105 transition-transform duration-200 flex flex-col justify-between">
    <div>
      <div className="flex items-center space-x-4">
        {icon && <div className={`p-3 rounded-full bg-primary/10 ${color}`}>{icon}</div>}
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <p className="text-sm text-content-secondary">{title}</p>
            {titleAction && <div className="text-content-secondary hover:text-content">{titleAction}</div>}
          </div>
          <p className={`text-2xl font-bold text-content`}>{value}</p>
          {description && <p className="text-xs text-neutral mt-1">{description}</p>}
        </div>
      </div>
    </div>
    {footerAction && (
      <div className="mt-4 pt-3 border-t border-base-300"> 
        {footerAction}
      </div>
    )}
  </Card>
);