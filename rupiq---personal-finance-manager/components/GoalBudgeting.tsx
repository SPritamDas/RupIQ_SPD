import React, { useState, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { FinancialGoal, IncomeItem } from '../types'; 
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Modal } from './common/Modal';
import { PlusCircleIcon, TrashIcon, PencilIcon, SparklesIcon } from './icons/IconComponents'; 
import { formatCurrency, getMonthlyIncome } from '../services/financeService'; 
import { DEFAULT_CURRENCY } from '../constants';
import { getMultiGoalSavingsSuggestion, AISavingsPlanResponse, AISavingsPlanBreakdown } from '../services/geminiService'; 
import RupIqChatbot from './common/RupIqChatbot';
import { DisclaimerCard } from './common/DisclaimerCard'; // Added import

const GoalBudgeting: React.FC = () => {
  const [goals, setGoals] = useLocalStorage<FinancialGoal[]>('financialGoals', []);
  const [incomes] = useLocalStorage<IncomeItem[]>('incomes', []); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);

  const initialFormState = {
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    description: '',
  };
  const [formState, setFormState] = useState(initialFormState);

  // State for AI Savings Planner
  const [userMonthlyIncome, setUserMonthlyIncome] = useState<string>('');
  const [aiSavingsPlan, setAiSavingsPlan] = useState<AISavingsPlanResponse | null>(null); // Updated type
  const [isLoadingAiPlan, setIsLoadingAiPlan] = useState<boolean>(false);
  const [aiPlanError, setAiPlanError] = useState<string | null>(null);
  const [isChatbotModalOpen, setIsChatbotModalOpen] = useState(false);

  useEffect(() => {
    const currentMonthIncome = getMonthlyIncome(incomes, new Date());
    setUserMonthlyIncome(currentMonthIncome.toString());
  }, [incomes]);


  const openModalForNew = () => {
    setEditingGoal(null);
    setFormState(initialFormState);
    setIsModalOpen(true);
  };

  const openModalForEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setFormState({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      targetDate: goal.targetDate,
      description: goal.description || '',
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmount = parseFloat(formState.targetAmount);
    const currentAmount = parseFloat(formState.currentAmount);

    if (isNaN(targetAmount) || targetAmount <= 0 || isNaN(currentAmount) || currentAmount < 0) {
      alert('Please enter valid positive amounts.');
      return;
    }
    if (currentAmount > targetAmount) {
        alert('Current amount cannot be greater than target amount.');
        return;
    }
    if (!formState.name.trim() || !formState.targetDate) {
        alert('Goal name and target date are required.');
        return;
    }

    const goalData: Omit<FinancialGoal, 'id'> = {
      name: formState.name,
      targetAmount,
      currentAmount,
      targetDate: formState.targetDate,
      description: formState.description,
    };

    if (editingGoal) {
      setGoals(goals.map(g => g.id === editingGoal.id ? { ...editingGoal, ...goalData } : g));
    } else {
      const newGoal: FinancialGoal = {
        id: Date.now().toString(),
        ...goalData,
      };
      setGoals([...goals, newGoal]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this financial goal?')) {
      setGoals(goals.filter(g => g.id !== id));
    }
  };
  
  const addFundsToGoal = (goalId: string, amountToAdd: number) => {
    setGoals(goals.map(g => {
      if (g.id === goalId) {
        const newCurrentAmount = Math.min(g.currentAmount + amountToAdd, g.targetAmount);
        return { ...g, currentAmount: newCurrentAmount };
      }
      return g;
    }));
  };

  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [selectedGoalForFunds, setSelectedGoalForFunds] = useState<FinancialGoal | null>(null);
  const [fundsToAdd, setFundsToAdd] = useState('');

  const openAddFundsModal = (goal: FinancialGoal) => {
    setSelectedGoalForFunds(goal);
    setFundsToAdd('');
    setIsAddFundsModalOpen(true);
  };

  const handleAddFundsSubmit = () => {
    if (!selectedGoalForFunds) return;
    const amount = parseFloat(fundsToAdd);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive amount to add.');
      return;
    }
    addFundsToGoal(selectedGoalForFunds.id, amount);
    setIsAddFundsModalOpen(false);
  };

  const handleGetAiSavingsPlan = async () => {
    const incomeToUse = parseFloat(userMonthlyIncome);
    if (isNaN(incomeToUse) || incomeToUse < 0) {
      setAiPlanError("Please enter a valid monthly income.");
      setAiSavingsPlan(null);
      return;
    }
    if (activeGoals.length === 0) { // Use activeGoals for this check
      setAiPlanError("Please add at least one active (incomplete) financial goal to get a savings plan.");
      setAiSavingsPlan(null);
      return;
    }

    setIsLoadingAiPlan(true);
    setAiPlanError(null);
    setAiSavingsPlan(null);
    try {
      const plan = await getMultiGoalSavingsSuggestion(activeGoals, incomeToUse); // Pass activeGoals
      setAiSavingsPlan(plan);
    } catch (error: any) {
      setAiPlanError(error.message || "Failed to fetch AI savings plan.");
      setAiSavingsPlan(null);
    } finally {
      setIsLoadingAiPlan(false);
    }
  };

  const activeGoals = goals.filter(g => g.currentAmount < g.targetAmount);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-content">Financial Goals</h1>
      <DisclaimerCard />

      <Card title="Set & Manage Financial Goals" actions={
        <div className="flex space-x-2">
            <Button onClick={() => setIsChatbotModalOpen(true)} variant="outline" leftIcon={<SparklesIcon />}>Chat with AI</Button>
            <Button onClick={openModalForNew} leftIcon={<PlusCircleIcon />}>Set New Goal</Button>
        </div>
        }>
        {goals.length === 0 ? (
          <p className="text-content-secondary text-center py-4">No financial goals set yet. Start planning for your future!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.sort((a,b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()).map(goal => {
              const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              const daysLeft = Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
              const isCompleted = goal.currentAmount >= goal.targetAmount;

              return (
                <Card key={goal.id} title={goal.name} className={`flex flex-col justify-between ${isCompleted ? 'border-2 border-green-500 bg-green-500/10' : 'bg-base-200'}`}>
                  <div>
                    <p className="text-sm text-content-secondary mb-1" title={goal.description}>{goal.description?.substring(0,50) || 'No description'}{goal.description && goal.description.length > 50 ? '...' : ''}</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(goal.targetAmount)}</p>
                    <p className="text-sm text-content-secondary">Target Date: {new Date(goal.targetDate).toLocaleDateString()}</p>
                    
                    <div className="my-3">
                      <div className="flex justify-between text-sm text-content-secondary mb-1">
                        <span>Saved: {formatCurrency(goal.currentAmount)}</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-base-300 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-secondary'}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                      </div>
                      {!isCompleted && <p className="text-xs text-neutral mt-1">{daysLeft} days left</p>}
                      {isCompleted && <p className="text-xs text-green-600 font-semibold mt-1">Goal Achieved! 🎉</p>}
                    </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-base-300 flex space-x-2">
                    {!isCompleted && 
                      <Button size="sm" variant="outline" onClick={() => openAddFundsModal(goal)}>Add Funds</Button>
                    }
                    <Button size="sm" variant="ghost" onClick={() => openModalForEdit(goal)} aria-label="Edit Goal">
                      <PencilIcon />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(goal.id)} className="text-red-600 hover:text-red-700 ml-auto" aria-label="Delete Goal">
                      <TrashIcon />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="AI-Powered Multi-Goal Savings Planner">
        <div className="space-y-4">
          <p className="text-content-secondary">Let RupIQ AI help you create a savings plan for your active goals.</p>
          
          <Input
            label="Your Current Monthly Income for Planning"
            type="number"
            value={userMonthlyIncome}
            onChange={(e) => setUserMonthlyIncome(e.target.value)}
            placeholder={`Enter monthly income in ${DEFAULT_CURRENCY}`}
            min="0"
            step="100"
            required
          />
          <p className="text-xs text-content-secondary -mt-3">
            Initially populated with your calculated income. Adjust if needed for planning.
          </p>

          {activeGoals.length > 0 ? (
            <div>
              <h4 className="text-md font-medium text-content mb-2">Active Goals for Planning:</h4>
              <ul className="list-disc list-inside space-y-1 pl-4 mb-4 text-sm text-content-secondary">
                {activeGoals.map(goal => (
                  <li key={goal.id}>
                    {goal.name} (Remaining: {formatCurrency(goal.targetAmount - goal.currentAmount)}, Deadline: {new Date(goal.targetDate).toLocaleDateString()})
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-content-secondary">No active (incomplete) goals to plan for. Add some goals first!</p>
          )}
          
          <Button 
            onClick={handleGetAiSavingsPlan} 
            isLoading={isLoadingAiPlan} 
            disabled={isLoadingAiPlan || activeGoals.length === 0}
            leftIcon={<SparklesIcon />}
          >
            {isLoadingAiPlan ? "Generating Plan..." : "Get AI Savings Plan"}
          </Button>

          {aiPlanError && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
              <p className="font-semibold">Error:</p><p>{aiPlanError}</p>
            </div>
          )}
          {aiSavingsPlan && !isLoadingAiPlan && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
              <h3 className="text-xl font-semibold text-primary">Your AI Savings Plan</h3>
              
              <div className="space-y-1">
                <p><strong className="text-content-secondary">Total Estimated Monthly Savings Needed:</strong> <span className="font-bold text-secondary">{formatCurrency(aiSavingsPlan.totalEstimatedMonthlySavingsNeeded)}</span></p>
                <p><strong className="text-content-secondary">Income Sufficiency:</strong> <span className={`font-semibold ${aiSavingsPlan.incomeSufficiency === 'Sufficient' ? 'text-green-600' : aiSavingsPlan.incomeSufficiency === 'Insufficient' ? 'text-red-600' : 'text-amber-600'}`}>{aiSavingsPlan.incomeSufficiency}</span></p>
              </div>

              <div>
                <h4 className="text-lg font-medium text-content mb-2">Overall Advice:</h4>
                <p className="text-content-secondary leading-relaxed">{aiSavingsPlan.overallAdvice}</p>
              </div>

              <div>
                <h4 className="text-lg font-medium text-content mb-2">Goal Breakdown & Recommendations:</h4>
                {aiSavingsPlan.goalBreakdown.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-base-300 border border-base-300 rounded-lg shadow-sm">
                      <thead className="bg-base-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Goal Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Remaining</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Months Left</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Implied Monthly</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">AI Suggested Monthly</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Priority</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-base-100 divide-y divide-base-300">
                        {aiSavingsPlan.goalBreakdown.map((item, index) => (
                          <tr key={index} className="hover:bg-base-200/50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-content">{item.goalName}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-content">{formatCurrency(item.remainingAmount)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-content text-center">{item.monthsLeft}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-content">{formatCurrency(item.impliedMonthlySaving)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-secondary">{formatCurrency(item.suggestedMonthlySaving)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-content">
                              <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full
                                ${item.priority === 'High' ? 'bg-red-100 text-red-800' : 
                                  item.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 
                                  item.priority === 'Low' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {item.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-content-secondary max-w-xs whitespace-normal">{item.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-content-secondary">No specific goal breakdown provided by AI.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>


      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGoal ? "Edit Financial Goal" : "Set New Financial Goal"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Goal Name" name="name" value={formState.name} onChange={handleInputChange} placeholder="e.g., Vacation Fund, New Car" required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={`Target Amount (${DEFAULT_CURRENCY})`}
              type="number"
              name="targetAmount"
              value={formState.targetAmount}
              onChange={handleInputChange}
              min="0.01" step="0.01"
              required
            />
            <Input
              label={`Currently Saved (${DEFAULT_CURRENCY})`}
              type="number"
              name="currentAmount"
              value={formState.currentAmount}
              onChange={handleInputChange}
              min="0" step="0.01"
              required
            />
          </div>
          <Input label="Target Date" name="targetDate" type="date" value={formState.targetDate} onChange={handleInputChange} required 
            min={new Date().toISOString().split("T")[0]} />
          <Input label="Description (Optional)" name="description" value={formState.description} onChange={handleInputChange} />
          
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingGoal ? "Save Changes" : "Set Goal"}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAddFundsModalOpen} onClose={() => setIsAddFundsModalOpen(false)} title={`Add Funds to "${selectedGoalForFunds?.name}"`}>
        <Input
            label={`Amount to Add (${DEFAULT_CURRENCY})`}
            type="number"
            value={fundsToAdd}
            onChange={(e) => setFundsToAdd(e.target.value)}
            min="0.01" step="0.01"
            placeholder="Enter amount"
            required
        />
        {selectedGoalForFunds && (
          <p className="text-sm text-content-secondary mb-2">
            Remaining to save: {formatCurrency(selectedGoalForFunds.targetAmount - selectedGoalForFunds.currentAmount)}
          </p>
        )}
        <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddFundsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFundsSubmit}>Add Funds</Button>
        </div>
      </Modal>

      <Modal isOpen={isChatbotModalOpen} onClose={() => setIsChatbotModalOpen(false)} title="RupIQ AI Chatbot" size="lg">
        <RupIqChatbot />
      </Modal>

    </div>
  );
};

export default GoalBudgeting;