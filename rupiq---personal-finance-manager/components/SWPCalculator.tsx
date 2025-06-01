
import React, { useState } from 'react';
import { Input } from './common/Input';
import { Select } from './common/Select';
import { Button } from './common/Button';
import { Card } from './common/Card';
import { formatCurrency, calculateSWPAmount } from '../services/financeService';
import { DEFAULT_CURRENCY } from '../constants';

const SWPCalculator: React.FC = () => {
  const [principal, setPrincipal] = useState('');
  const [annualWithdrawalRate, setAnnualWithdrawalRate] = useState(''); // (%)
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [withdrawalAmount, setWithdrawalAmount] = useState<number | null>(null);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(principal);
    const awr = parseFloat(annualWithdrawalRate);

    if (isNaN(p) || isNaN(awr) || p <= 0 || awr <= 0) {
      alert('Please enter valid positive numbers for principal and withdrawal rate.');
      setWithdrawalAmount(null);
      return;
    }

    const wa = calculateSWPAmount(p, awr, frequency);
    setWithdrawalAmount(wa);
  };

  return (
    <Card title="SWP Calculator">
      <form onSubmit={handleCalculate} className="space-y-4">
        <Input
          label="Total Investment (Principal)"
          type="number"
          value={principal}
          onChange={(e) => setPrincipal(e.target.value)}
          placeholder={`e.g., 1000000 ${DEFAULT_CURRENCY}`}
          required
        />
        <Input
          label="Annual Withdrawal Rate (%)"
          type="number"
          value={annualWithdrawalRate}
          onChange={(e) => setAnnualWithdrawalRate(e.target.value)}
          placeholder="e.g., 4"
          min="0.1"
          step="0.1"
          required
        />
        <Select
          label="Withdrawal Frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as 'monthly' | 'yearly')}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: 'Yearly' },
          ]}
          required
        />
        <Button type="submit" className="w-full">Calculate Withdrawal Amount</Button>
      </form>

      {withdrawalAmount !== null && (
        <div className="mt-6 p-4 bg-base-200 rounded-lg">
          <h4 className="text-lg font-semibold text-content">Calculation Result:</h4>
          <p className="flex justify-between text-xl mt-2">
            <span className="font-semibold text-primary">Estimated {frequency === 'monthly' ? 'Monthly' : 'Yearly'} Withdrawal:</span>
            <span className="font-bold text-primary">{formatCurrency(withdrawalAmount)}</span>
          </p>
        </div>
      )}
    </Card>
  );
};

export default SWPCalculator;