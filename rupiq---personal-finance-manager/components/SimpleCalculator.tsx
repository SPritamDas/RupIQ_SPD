
import React, { useState } from 'react';
import { Card } from './common/Card';
import { Button } from './common/Button';

const SimpleCalculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearDisplay = () => {
    setDisplay('0');
    setCurrentValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (currentValue === null) {
      setCurrentValue(inputValue);
    } else if (operator) {
      const result = calculate(currentValue, inputValue, operator);
      setCurrentValue(result);
      setDisplay(String(result));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (left: number, right: number, op: string): number => {
    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return right === 0 ? Infinity : left / right; // Handle division by zero
      default: return right;
    }
  };
  
  const handleEquals = () => {
    if (operator && currentValue !== null) {
        const inputValue = parseFloat(display);
        const result = calculate(currentValue, inputValue, operator);
        setDisplay(String(result));
        setCurrentValue(result); 
        setOperator(null); 
        setWaitingForOperand(true); 
    }
  };


  const buttons = [
    ['AC', '±', '%', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '='],
  ];

  const handleButtonClick = (value: string) => {
    if (/\d/.test(value)) {
      inputDigit(value);
    } else if (value === '.') {
      inputDecimal();
    } else if (value === 'AC') {
      clearDisplay();
    } else if (value === '=') {
        handleEquals();
    } else if (['+', '-', '*', '/'].includes(value)) {
      performOperation(value);
    } else if (value === '±') {
      setDisplay(String(parseFloat(display) * -1));
    } else if (value === '%') {
      setDisplay(String(parseFloat(display) / 100));
      setWaitingForOperand(true); 
    }
  };

  return (
    <Card title="Simple Calculator">
      {/* Changed display background for dark theme */}
      <div className="bg-black text-gray-100 p-4 rounded-t-lg text-right text-4xl font-mono break-all h-20 flex items-end justify-end">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-px bg-base-300 rounded-b-lg overflow-hidden">
        {buttons.flat().map((btn) => {
          const isOperatorOrEquals = ['/', '*', '-', '+', '='].includes(btn);
          // Adjusted non-operator button colors for dark theme
          const buttonSpecificClass = isOperatorOrEquals
            ? 'bg-accent text-white hover:bg-accent/90'
            : 'bg-base-300 text-content hover:bg-neutral/50';

          return (
            <Button
              key={btn}
              onClick={() => handleButtonClick(btn)}
              variant="ghost" // Using ghost and then overriding background ensures focus styles are consistent
              className={`
                text-2xl h-20 rounded-none focus:ring-0 
                ${btn === '0' ? 'col-span-2' : ''}
                ${buttonSpecificClass}
              `}
            >
              {btn}
            </Button>
          );
        })}
      </div>
    </Card>
  );
};

export default SimpleCalculator;
