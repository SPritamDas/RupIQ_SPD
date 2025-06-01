import React from 'react';
import { Card } from './Card';
import { ExclamationTriangleIcon } from '../icons/IconComponents';

interface DisclaimerCardProps {
  message?: string;
}

const DefaultDisclaimerMessage = "RupIQ is not a registered financial advisor. Information and suggestions provided (including AI-generated content and calculator results) are for informational purposes only, based on AI models and user-provided data or formulas. They should not be considered as professional financial advice. Always consult with a qualified financial professional before making financial decisions.";

export const DisclaimerCard: React.FC<DisclaimerCardProps> = ({ message = DefaultDisclaimerMessage }) => {
  return (
    <Card className="bg-amber-50 border border-amber-400 dark:bg-amber-900/30 dark:border-amber-700">
      <div className="flex items-start">
        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-500 mr-3 flex-shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {message}
        </p>
      </div>
    </Card>
  );
};
