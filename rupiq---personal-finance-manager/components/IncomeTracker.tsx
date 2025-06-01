
import React, { useState } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { IncomeItem, IncomeCategory } from '../types';
import { INCOME_CATEGORIES, DEFAULT_CURRENCY } from '../constants';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Select } from './common/Select';
import { Modal } from './common/Modal';
import { PlusCircleIcon, TrashIcon, PencilIcon } from './icons/IconComponents';
import { formatCurrency, calculateTotal, aggregateIncomesByCategory } from '../services/financeService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { CHART_COLORS } from '../constants';

const IncomeTracker: React.FC = () => {
  const [incomes, setIncomes] = useLocalStorage<IncomeItem[]>('incomes', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeItem | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<IncomeCategory>(IncomeCategory.SALARY);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const openModalForNew = () => {
    setEditingIncome(null);
    setDate(new Date().toISOString().split('T')[0]);
    setCategory(IncomeCategory.SALARY);
    setAmount('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openModalForEdit = (income: IncomeItem) => {
    setEditingIncome(income);
    setDate(income.date);
    setCategory(income.category);
    setAmount(income.amount.toString());
    setDescription(income.description);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const incomeAmount = parseFloat(amount);
    if (isNaN(incomeAmount) || incomeAmount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    if (editingIncome) {
      setIncomes(incomes.map(inc => inc.id === editingIncome.id ? { ...editingIncome, date, category, amount: incomeAmount, description } : inc));
    } else {
      const newIncome: IncomeItem = {
        id: Date.now().toString(),
        date,
        category,
        amount: incomeAmount,
        description,
      };
      setIncomes([...incomes, newIncome]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this income record?')) {
      setIncomes(incomes.filter(income => income.id !== id));
    }
  };
  
  const totalIncome = calculateTotal(incomes);
  const incomeChartData = aggregateIncomesByCategory(incomes, new Date()); // Using current month for chart

  return (
    <div className="space-y-6">
      <Card title="Income Overview" actions={<Button onClick={openModalForNew} leftIcon={<PlusCircleIcon />}>Add Income</Button>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
                <p className="text-lg text-content-secondary">Total Income Recorded:</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
            {incomeChartData.length > 0 && (
                 <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={incomeChartData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => formatCurrency(value, '')} />
                            <YAxis type="category" dataKey="name" width={100} interval={0} tick={{ fontSize: 12 }}/>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="value" name="Income" >
                                {incomeChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
      </Card>

      <Card title="Income Records">
        {incomes.length === 0 ? (
          <p className="text-content-secondary text-center py-4">No income records yet. Add your first income!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-base-300">
              <thead className="bg-base-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-content-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-base-200 divide-y divide-base-300">
                {incomes.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((income) => (
                  <tr key={income.id} className="hover:bg-base-300">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-content">{new Date(income.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-content">{income.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{formatCurrency(income.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-content max-w-xs truncate" title={income.description}>{income.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => openModalForEdit(income)} aria-label="Edit">
                        <PencilIcon />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(income.id)} className="text-red-600 hover:text-red-700" aria-label="Delete">
                        <TrashIcon />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingIncome ? "Edit Income" : "Add New Income"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as IncomeCategory)}
            options={INCOME_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
            required
          />
          <Input
            label={`Amount (${DEFAULT_CURRENCY})`}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g., 50000"
            min="0.01"
            step="0.01"
            required
          />
          <Input label="Description (Optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Monthly Salary" />
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingIncome ? "Save Changes" : "Add Income"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default IncomeTracker;
