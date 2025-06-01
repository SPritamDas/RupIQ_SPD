
import React, { useState } from 'react';
import { Card } from './common/Card';
import SIPCalculator from './SIPCalculator';
import SWPCalculator from './SWPCalculator';
import SimpleCalculator from './SimpleCalculator';
import { Button } from './common/Button';

type CalculatorType = 'sip' | 'swp' | 'simple';

const CalculatorsPage: React.FC = () => {
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>('sip');

  const renderCalculator = () => {
    switch (activeCalculator) {
      case 'sip':
        return <SIPCalculator />;
      case 'swp':
        return <SWPCalculator />;
      case 'simple':
        return <SimpleCalculator />;
      default:
        return <SIPCalculator />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap gap-2 mb-6 border-b border-base-300 pb-4">
          <Button 
            variant={activeCalculator === 'sip' ? 'primary' : 'ghost'}
            onClick={() => setActiveCalculator('sip')}
          >
            SIP Calculator
          </Button>
          <Button 
            variant={activeCalculator === 'swp' ? 'primary' : 'ghost'}
            onClick={() => setActiveCalculator('swp')}
          >
            SWP Calculator
          </Button>
          <Button 
            variant={activeCalculator === 'simple' ? 'primary' : 'ghost'}
            onClick={() => setActiveCalculator('simple')}
          >
            Simple Calculator
          </Button>
        </div>
        {renderCalculator()}
      </Card>
    </div>
  );
};

export default CalculatorsPage;
