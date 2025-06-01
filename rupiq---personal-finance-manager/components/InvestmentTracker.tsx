
import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { InvestmentItem, InvestmentType } from '../types';
import { INVESTMENT_TYPES, DEFAULT_CURRENCY } from '../constants';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Select } from './common/Select';
import { Modal } from './common/Modal';
import { PlusCircleIcon, TrashIcon, PencilIcon } from './icons/IconComponents';
import { formatCurrency, calculateTotal } from '../services/financeService';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CHART_COLORS } from '../constants';

const InvestmentTracker: React.FC = () => {
  const [investments, setInvestments] = useLocalStorage<InvestmentItem[]>('investments', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentItem | null>(null);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    type: InvestmentType.STOCKS,
    name: '',
    amountInvested: '',
    currentValue: '',
    platform: '',
  };
  const [formState, setFormState] = useState(initialFormState);

  const openModalForNew = () => {
    setEditingInvestment(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  };

  const openModalForEdit = (investment: InvestmentItem) => {
    setEditingInvestment(investment);
    setFormState({
      date: investment.date,
      type: investment.type,
      name: investment.name,
      amountInvested: investment.amountInvested.toString(),
      currentValue: investment.currentValue.toString(),
      platform: investment.platform || '',
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountInvested = parseFloat(formState.amountInvested);
    const currentValue = parseFloat(formState.currentValue);

    if (isNaN(amountInvested) || amountInvested <= 0 || isNaN(currentValue) || currentValue < 0) {
      alert('Please enter valid positive amounts for investment and current value.');
      return;
    }
    if (!formState.name.trim()) {
        alert('Please enter the investment name.');
        return;
    }

    const investmentData: Omit<InvestmentItem, 'id'> = {
      date: formState.date,
      type: formState.type,
      name: formState.name,
      amountInvested,
      currentValue,
      platform: formState.platform,
    };

    if (editingInvestment) {
      setInvestments(investments.map(inv => inv.id === editingInvestment.id ? { ...editingInvestment, ...investmentData } : inv));
    } else {
      const newInvestment: InvestmentItem = {
        id: Date.now().toString(),
        ...investmentData,
      };
      setInvestments([...investments, newInvestment]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this investment record?')) {
      setInvestments(investments.filter(inv => inv.id !== id));
    }
  };

  const totalInvested = calculateTotal(investments.map(i => ({amount: i.amountInvested})));
  const totalCurrentValue = calculateTotal(investments.map(i => ({amount: i.currentValue})));
  const overallProfitLoss = totalCurrentValue - totalInvested;

  const investmentChartData = investments.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.type);
    if (existing) {
      existing.value += curr.currentValue;
    } else {
      acc.push({ name: curr.type, value: curr.currentValue });
    }
    return acc;
  }, [] as Array<{name: string, value: number}>).sort((a,b) => b.value - a.value);


  return (
    <div className="space-y-6">
      <Card title="Investment Portfolio Overview" actions={<Button onClick={openModalForNew} leftIcon={<PlusCircleIcon />}>Add Investment</Button>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center md:text-left">
            <div>
                <p className="text-md text-content-secondary">Total Invested:</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalInvested)}</p>
            </div>
            <div>
                <p className="text-md text-content-secondary">Current Portfolio Value:</p>
                <p className="text-2xl font-bold text-content">{formatCurrency(totalCurrentValue)}</p>
            </div>
            <div>
                <p className="text-md text-content-secondary">Overall P/L:</p>
                <p className={`text-2xl font-bold ${overallProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(overallProfitLoss)} ({totalInvested > 0 ? ((overallProfitLoss / totalInvested) * 100).toFixed(2) : 0}%)
                </p>
            </div>
        </div>
        {investmentChartData.length > 0 && (
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={investmentChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false}
                             label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                            {investmentChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        )}
      </Card>

      <Card title="Investment Records">
        {investments.length === 0 ? (
          <p className="text-content-secondary text-center py-4">No investment records yet. Add your first investment!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-base-300">
              <thead className="bg-base-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Invested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Current Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">P/L</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-content-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-base-200 divide-y divide-base-300">
                {investments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((inv) => {
                    const profitLoss = inv.currentValue - inv.amountInvested;
                    return (
                        <tr key={inv.id} className="hover:bg-base-300">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-content">{new Date(inv.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-content font-medium">{inv.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-content">{inv.type}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-content">{formatCurrency(inv.amountInvested)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-content font-semibold">{formatCurrency(inv.currentValue)}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(profitLoss)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <Button size="sm" variant="ghost" onClick={() => openModalForEdit(inv)} aria-label="Edit">
                                <PencilIcon />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(inv.id)} className="text-red-600 hover:text-red-700" aria-label="Delete">
                                <TrashIcon />
                            </Button>
                            </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingInvestment ? "Edit Investment" : "Add New Investment"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Date" type="date" name="date" value={formState.date} onChange={handleInputChange} required />
            <Select
              label="Investment Type"
              name="type"
              value={formState.type}
              onChange={handleInputChange}
              options={INVESTMENT_TYPES.map(type => ({ value: type, label: type }))}
              required
            />
          </div>
          <Input label="Investment Name" name="name" value={formState.name} onChange={handleInputChange} placeholder="e.g., Reliance Industries, BTC, HDFC Index Fund" required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`Amount Invested (${DEFAULT_CURRENCY})`}
              type="number"
              name="amountInvested"
              value={formState.amountInvested}
              onChange={handleInputChange}
              min="0.01" step="0.01"
              required
            />
            <Input
              label={`Current Value (${DEFAULT_CURRENCY})`}
              type="number"
              name="currentValue"
              value={formState.currentValue}
              onChange={handleInputChange}
              min="0" step="0.01"
              required
            />
          </div>
          <Input label="Platform/Broker (Optional)" name="platform" value={formState.platform} onChange={handleInputChange} placeholder="e.g., Zerodha, Binance" />
          
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingInvestment ? "Save Changes" : "Add Investment"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InvestmentTracker;
