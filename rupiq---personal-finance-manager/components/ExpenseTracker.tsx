
import React, { useState, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { ExpenseItem, ExpenseCategory, ExpenseType, SplitDetail, SplitEvent, SplitEventParticipant } from '../types';
import { EXPENSE_CATEGORIES, EXPENSE_TYPES, DEFAULT_CURRENCY } from '../constants';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Input, Textarea } from './common/Input';
import { Select } from './common/Select';
import { Modal } from './common/Modal';
import { PlusCircleIcon, TrashIcon, PencilIcon, EyeIcon } from './icons/IconComponents';
import { formatCurrency, calculateTotal, aggregateExpensesByCategory } from '../services/financeService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { CHART_COLORS } from '../constants';


const ExpenseTracker: React.FC = () => {
  const [expenses, setExpenses] = useLocalStorage<ExpenseItem[]>('expenses', []);
  const [splitEvents, setSplitEvents] = useLocalStorage<SplitEvent[]>('splitEvents', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [viewingExpense, setViewingExpense] = useState<ExpenseItem | null>(null);

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    category: ExpenseCategory.FOOD,
    type: ExpenseType.VARIABLE,
    amount: '', // This will be for the total bill amount initially
    description: '',
    isSplit: false,
    splitDetails: [{ friendName: '', amount: 0 }] as SplitDetail[],
  };
  const [formState, setFormState] = useState(initialFormState);

  const generateSplitEventId = (expenseId: string) => `expense-${expenseId}`;

  // originalTotalBillAmount is the full amount of the bill before splitting.
  // expense.amount will be "My Share" if it was split.
  const syncSplitEvent = (expense: ExpenseItem, originalTotalBillAmount: number) => {
    const splitEventId = generateSplitEventId(expense.id);
    
    if (expense.isSplit && expense.splitDetails && expense.splitDetails.length > 0) {
      const myShare = expense.amount; // This is already "My Share"

      const meParticipant: SplitEventParticipant = {
        name: 'Me',
        share: myShare,
        paid: originalTotalBillAmount, // "Me" paid the total original bill
      };

      const friendParticipants: SplitEventParticipant[] = expense.splitDetails.map(detail => ({
        name: detail.friendName,
        share: detail.amount, // Friend's share of the original total bill
        paid: 0, 
      }));
      
      const newOrUpdatedEvent: SplitEvent = {
        id: splitEventId,
        description: `Expense: ${expense.description || expense.category}`,
        date: expense.date,
        totalAmount: originalTotalBillAmount, // Event total is the original bill amount
        paidBy: 'Me', 
        participants: [meParticipant, ...friendParticipants],
      };

      setSplitEvents(prevEvents => {
        const existingEventIndex = prevEvents.findIndex(ev => ev.id === splitEventId);
        if (existingEventIndex > -1) {
          const updatedEvents = [...prevEvents];
          updatedEvents[existingEventIndex] = newOrUpdatedEvent;
          return updatedEvents;
        }
        return [...prevEvents, newOrUpdatedEvent];
      });
    } else {
      setSplitEvents(prevEvents => prevEvents.filter(ev => ev.id !== splitEventId));
    }
  };

  const removeSplitEventSync = (expenseId: string) => {
    const splitEventId = generateSplitEventId(expenseId);
    setSplitEvents(prevEvents => prevEvents.filter(ev => ev.id !== splitEventId));
  };


  const openModalForNew = () => {
    setEditingExpense(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  };

  const openModalForEdit = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setFormState({
      date: expense.date,
      category: expense.category,
      type: expense.type,
      // If editing, 'amount' in form should be the original total amount if split, or 'my share' if not.
      // This makes editing intuitive: user edits the total bill, then split details adjust.
      amount: (expense.isSplit && expense.originalTotalAmount !== undefined) ? expense.originalTotalAmount.toString() : expense.amount.toString(),
      description: expense.description,
      isSplit: expense.isSplit,
      splitDetails: expense.splitDetails && expense.splitDetails.length > 0 
                    ? JSON.parse(JSON.stringify(expense.splitDetails.map(sd => ({ friendName: sd.friendName, amount: sd.amount })))) 
                    : [{ friendName: '', amount: 0 }],
    });
    setIsModalOpen(true);
  };

  const openViewModal = (expense: ExpenseItem) => {
    setViewingExpense(expense);
    setIsViewModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
  
    if (name === 'isSplit' && checked !== undefined) {
      const newIsSplitValue = checked;
      setFormState(prev => {
        let newSplitDetails = prev.splitDetails.length > 0 ? [...prev.splitDetails] : [{ friendName: '', amount: 0 }];
        return {
          ...prev,
          isSplit: newIsSplitValue,
          splitDetails: newSplitDetails,
        };
      });
    } else {
      setFormState(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };
  
  const handleSplitDetailChange = (index: number, field: keyof SplitDetail, value: string | number) => {
    const newSplitDetails = formState.splitDetails.map((detail, i) => {
        if (i === index) {
            const updatedDetail = { ...detail };
            if (field === 'amount' && typeof value === 'string') {
                (updatedDetail as any)[field] = parseFloat(value) || 0;
            } else {
                (updatedDetail as any)[field] = value;
            }
            return updatedDetail;
        }
        return detail;
    });
    setFormState(prev => ({ ...prev, splitDetails: newSplitDetails }));
  };

  const addSplitFriend = () => {
    setFormState(prev => ({
      ...prev,
      splitDetails: [...prev.splitDetails, { friendName: '', amount: 0 }],
    }));
  };
  
  const removeSplitFriend = (index: number) => {
    setFormState(prev => ({
      ...prev,
      splitDetails: prev.splitDetails.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalBillAmountFromForm = parseFloat(formState.amount); // This is the total bill amount entered by user
    if (isNaN(totalBillAmountFromForm) || totalBillAmountFromForm <= 0) {
      alert('Please enter a valid positive amount for the total expense.');
      return;
    }

    let finalSplitDetails = formState.isSplit ? [...formState.splitDetails] : [];
    let amountForExpenseItem = totalBillAmountFromForm; // By default, "My Share" is the total bill
    let originalTotalForStorage: number | undefined = undefined;

    if (formState.isSplit) {
        finalSplitDetails = finalSplitDetails.filter(d => d.friendName.trim() !== '' || d.amount !== 0);
        if(finalSplitDetails.length === 0 && formState.isSplit) { // isSplit is checked but no valid friends
            alert('If splitting, please add at least one friend and their share, or uncheck "Split this expense".');
            return;
        }
        if (finalSplitDetails.some(detail => !detail.friendName.trim())) {
            alert('Please ensure all split participants have a name.');
            return;
        }
        if (finalSplitDetails.some(detail => detail.amount < 0)) {
            alert('Split amounts for friends cannot be negative.');
            return;
        }

        const totalFriendsShares = finalSplitDetails.reduce((sum, detail) => sum + detail.amount, 0);
        
        if (totalFriendsShares > totalBillAmountFromForm + 0.01) {
            alert(`Sum of friends' shares (${formatCurrency(totalFriendsShares)}) cannot exceed the total expense amount (${formatCurrency(totalBillAmountFromForm)}). Please adjust.`);
            return;
        }
        
        amountForExpenseItem = totalBillAmountFromForm - totalFriendsShares; // This is "My Share"
        if (amountForExpenseItem < -0.01) {
             alert(`Your calculated share (${formatCurrency(amountForExpenseItem)}) is negative. Please adjust total expense amount or friends' shares.`);
             return;
        }
        amountForExpenseItem = Math.max(0, amountForExpenseItem);
        originalTotalForStorage = totalBillAmountFromForm; // Store the original total bill
    }


    const expenseDataPayload: ExpenseItem = {
      id: editingExpense ? editingExpense.id : Date.now().toString(),
      date: formState.date,
      category: formState.category,
      type: formState.type,
      amount: amountForExpenseItem, // Store "My Share"
      description: formState.description,
      isSplit: formState.isSplit && finalSplitDetails.length > 0,
      splitDetails: (formState.isSplit && finalSplitDetails.length > 0) ? finalSplitDetails : undefined,
      originalTotalAmount: (formState.isSplit && finalSplitDetails.length > 0) ? originalTotalForStorage : undefined,
    };

    if (editingExpense) {
      setExpenses(expenses.map(exp => exp.id === editingExpense.id ? expenseDataPayload : exp));
    } else {
      setExpenses([...expenses, expenseDataPayload]);
    }
    
    // Pass the original total bill amount to syncSplitEvent
    syncSplitEvent(expenseDataPayload, totalBillAmountFromForm); 
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense record?')) {
      setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
      removeSplitEventSync(id); 
    }
  };

  const totalExpenses = calculateTotal(expenses); // This will now sum up "My Share" amounts
  const expenseChartData = aggregateExpensesByCategory(expenses, new Date()); // This uses "My Share"

  const friendsSharesTotalInForm = formState.splitDetails.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const currentMyShareInForm = (parseFloat(formState.amount) || 0) - friendsSharesTotalInForm;


  return (
    <div className="space-y-6">
      <Card title="Expense Overview" actions={<Button onClick={openModalForNew} leftIcon={<PlusCircleIcon />}>Add Expense</Button>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
                <p className="text-lg text-content-secondary">Total Expenses Recorded (Your Share):</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
            {expenseChartData.length > 0 && (
                 <div className="h-64"> 
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={expenseChartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => formatCurrency(value, '')} />
                            <YAxis type="category" dataKey="name" width={100} interval={0} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="value" name="Expenses (Your Share)">
                                {expenseChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
      </Card>

      <Card title="Expense Records (Showing Your Share)">
        {expenses.length === 0 ? (
          <p className="text-content-secondary text-center py-4">No expense records yet. Add your first expense!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-base-300">
              <thead className="bg-base-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Your Share</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Split?</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-content-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-base-200 divide-y divide-base-300"> 
                {expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense) => (
                  <tr key={expense.id} className="hover:bg-base-300"> 
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-content">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-content">{expense.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-content">{expense.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{formatCurrency(expense.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-content">{expense.isSplit ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openViewModal(expense)} aria-label="View Details">
                        <EyeIcon />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openModalForEdit(expense)} aria-label="Edit">
                        <PencilIcon />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(expense.id)} className="text-red-600 hover:text-red-700" aria-label="Delete">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingExpense ? "Edit Expense" : "Add New Expense"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Date" type="date" name="date" value={formState.date} onChange={handleInputChange} required />
            <Input
              label={`Total Bill Amount (${DEFAULT_CURRENCY})`}
              type="number"
              name="amount" // This form field represents the total bill
              value={formState.amount}
              onChange={handleInputChange}
              placeholder="e.g., 500 (Full bill amount)"
              min="0.01"
              step="0.01"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              name="category"
              value={formState.category}
              onChange={handleInputChange}
              options={EXPENSE_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
              required
            />
            <Select
              label="Type"
              name="type"
              value={formState.type}
              onChange={handleInputChange}
              options={EXPENSE_TYPES.map(type => ({ value: type, label: type }))}
              required
            />
          </div>
          <Textarea label="Description (Optional)" name="description" value={formState.description} onChange={handleInputChange} placeholder="e.g., Lunch with colleagues" />
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isSplit"
              name="isSplit"
              checked={formState.isSplit}
              onChange={handleInputChange}
              className="h-4 w-4 text-primary border-base-300 rounded focus:ring-primary mr-2"
            />
            <label htmlFor="isSplit" className="text-sm text-content-secondary">Split this expense with friends?</label>
          </div>

          {formState.isSplit && (
            <div className="space-y-3 p-3 border border-base-300 rounded-md">
              <h4 className="text-md font-semibold text-content">Friends' Shares (from Total Bill):</h4>
              {formState.splitDetails.map((detail, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-7 gap-x-3 gap-y-2 items-center">
                  <Input
                    containerClassName="mb-0 sm:col-span-3"
                    label="Friend's Name"
                    value={detail.friendName}
                    onChange={(e) => handleSplitDetailChange(index, 'friendName', e.target.value)}
                    required={formState.isSplit} 
                  />
                  <Input
                    containerClassName="mb-0 sm:col-span-3"
                    label="Friend's Share Amt."
                    type="number"
                    value={detail.amount.toString()}
                    min="0" step="0.01" 
                    onChange={(e) => handleSplitDetailChange(index, 'amount', e.target.value)}
                    required={formState.isSplit}
                  />
                  <div className="flex items-end h-full sm:col-span-1">
                     <Button type="button" size="sm" variant="ghost" onClick={() => removeSplitFriend(index)} className="text-red-500 hover:text-red-700" aria-label="Remove Friend Split">
                        <TrashIcon className="w-4 h-4"/>
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addSplitFriend} leftIcon={<PlusCircleIcon className="w-4 h-4" />}>Add Another Friend</Button>
              
              <div className="mt-3 p-2 bg-base-100 rounded">
                <p className="text-sm text-content-secondary font-medium">Your Calculated Share: 
                    <span className={`font-bold ml-1 ${currentMyShareInForm < 0 ? 'text-red-500' : 'text-content'}`}>
                        {formatCurrency(currentMyShareInForm)}
                    </span>
                     <span className="text-xs"> (from Total Bill Amount of {formatCurrency(parseFloat(formState.amount) || 0)})</span>
                </p>
                {currentMyShareInForm < 0 && <p className="text-xs text-red-500 mt-1">Your share cannot be negative. Please adjust total bill or friends' shares.</p>}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingExpense ? "Save Changes" : "Add Expense"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Expense Details" size="md">
        {viewingExpense && (
          <div className="space-y-3 text-sm">
            <p><strong className="text-content-secondary">Date:</strong> {new Date(viewingExpense.date).toLocaleDateString()}</p>
            <p><strong className="text-content-secondary">Category:</strong> {viewingExpense.category}</p>
            <p><strong className="text-content-secondary">Type:</strong> {viewingExpense.type}</p>
            <p><strong className="text-content-secondary">Your Share (Amount Recorded):</strong> <span className="font-semibold text-red-600">{formatCurrency(viewingExpense.amount)}</span></p>
            {viewingExpense.isSplit && viewingExpense.originalTotalAmount !== undefined && (
                 <p><strong className="text-content-secondary">Original Total Bill:</strong> {formatCurrency(viewingExpense.originalTotalAmount)}</p>
            )}
            <p><strong className="text-content-secondary">Description:</strong> {viewingExpense.description || 'N/A'}</p>
            <p><strong className="text-content-secondary">Split Expense:</strong> {viewingExpense.isSplit ? 'Yes' : 'No'}</p>
            
            {viewingExpense.isSplit && viewingExpense.splitDetails && viewingExpense.splitDetails.length > 0 && (
              <div>
                <strong className="text-content-secondary">Friends' Shares (from original bill):</strong>
                <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                  {viewingExpense.splitDetails.map((detail, index) => (
                    <li key={index}>
                      {detail.friendName}: {formatCurrency(detail.amount)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
             <div className="flex justify-end pt-4">
                <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExpenseTracker;
