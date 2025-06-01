
import React, { useState } from 'react';
import { Input } from './common/Input';
import { Button } from './common/Button';
import { Card } from './common/Card';
import { formatCurrency, calculateSIPFutureValue } from '../services/financeService';
import { DEFAULT_CURRENCY } from '../constants';

const SIPCalculator: React.FC = () => {
  const [monthlyInvestment, setMonthlyInvestment] = useState('');
  const [annualRate, setAnnualRate] = useState(''); // Expected annual rate of return (%)
  const [timePeriod, setTimePeriod] = useState(''); // In years
  const [futureValue, setFutureValue] = useState<number | null>(null);
  const [totalInvested, setTotalInvested] = useState<number | null>(null);
  const [wealthGained, setWealthGained] = useState<number | null>(null);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const mi = parseFloat(monthlyInvestment);
    const ar = parseFloat(annualRate);
    const tp = parseFloat(timePeriod);

    if (isNaN(mi) || isNaN(ar) || isNaN(tp) || mi <= 0 || ar < 0 || tp <= 0) {
      alert('Please enter valid positive numbers for all fields.');
      setFutureValue(null);
      setTotalInvested(null);
      setWealthGained(null);
      return;
    }

    const fv = calculateSIPFutureValue(0, ar, tp, mi); // Principal is 0 for pure SIP calculation starting from scratch
    const ti = mi * tp * 12;
    const wg = fv - ti;

    setFutureValue(fv);
    setTotalInvested(ti);
    setWealthGained(wg);
  };

  return (
    <Card title="SIP Calculator">
      <form onSubmit={handleCalculate} className="space-y-4">
        <Input
          label="Monthly Investment Amount"
          type="number"
          value={monthlyInvestment}
          onChange={(e) => setMonthlyInvestment(e.target.value)}
          placeholder={`e.g., 5000 ${DEFAULT_CURRENCY}`}
          required
        />
        <Input
          label="Expected Annual Rate of Return (%)"
          type="number"
          value={annualRate}
          onChange={(e) => setAnnualRate(e.target.value)}
          placeholder="e.g., 12"
          min="0"
          step="0.1"
          required
        />
        <Input
          label="Time Period (Years)"
          type="number"
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value)}
          placeholder="e.g., 10"
          min="1"
          required
        />
        <Button type="submit" className="w-full">Calculate Future Value</Button>
      </form>

      {futureValue !== null && totalInvested !== null && wealthGained !== null && (
        <div className="mt-6 p-4 bg-base-200 rounded-lg space-y-3">
          <h4 className="text-lg font-semibold text-content">Calculation Results:</h4>
          <p className="flex justify-between">
            <span className="text-content-secondary">Total Amount Invested:</span>
            <span className="font-medium text-content">{formatCurrency(totalInvested)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-content-secondary">Estimated Wealth Gained:</span>
            <span className="font-medium text-green-600">{formatCurrency(wealthGained)}</span>
          </p>
          <p className="flex justify-between text-xl">
            <span className="font-semibold text-primary">Estimated Future Value:</span>
            <span className="font-bold text-primary">{formatCurrency(futureValue)}</span>
          </p>
        </div>
      )}
    </Card>
  );
};

export default SIPCalculator;