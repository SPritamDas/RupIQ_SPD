
import React, { useState } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useLocalStorage from '../hooks/useLocalStorage';
import { IncomeItem, ExpenseItem, InvestmentItem, DailyBudget, UserDebts, CategoryDataPoint, TimeSeriesDataPoint, TodoTask } from '../types';
import { Card, StatCard } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Modal } from './common/Modal';
import {
  getMonthlyIncome,
  getMonthlyExpenses,
  formatCurrency,
  getTodaysVariableExpenses,
  aggregateExpensesByCategory,
  aggregateInvestmentsByType, 
  getMonthlyExpenseTrend,
  getMonthlyInvestmentTrend,
} from '../services/financeService';
import { CHART_COLORS, DEFAULT_CURRENCY } from '../constants';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ExclamationTriangleIcon, EyeIcon, EyeSlashIcon, PlusCircleIcon, SparklesIcon } from './icons/IconComponents';
import RupIqChatbot from './common/RupIqChatbot';


interface DashboardProps {
  setActivePage: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActivePage }) => {
  const [incomes] = useLocalStorage<IncomeItem[]>('incomes', []);
  const [expenses] = useLocalStorage<ExpenseItem[]>('expenses', []);
  const [investments] = useLocalStorage<InvestmentItem[]>('investments', []);
  const [dailyBudget, setDailyBudget] = useLocalStorage<DailyBudget>('dailyBudget', { amount: 500 });
  const [userDebts, setUserDebts] = useLocalStorage<UserDebts>('userDebts', { totalDebt: 0 });
  const [isMonthlyIncomeVisible, setIsMonthlyIncomeVisible] = useLocalStorage<boolean>('isMonthlyIncomeVisible', true);
  const [todoTasks] = useLocalStorage<TodoTask[]>('todoTasks', []);


  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState<string>(dailyBudget.amount.toString());
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [newDebtAmount, setNewDebtAmount] = useState<string>(userDebts.totalDebt.toString());
  const [isChatbotModalOpen, setIsChatbotModalOpen] = useState(false);

  const currentDate = new Date();
  const monthlyIncome = getMonthlyIncome(incomes, currentDate);
  const monthlyExpensesNum = getMonthlyExpenses(expenses, currentDate);
  
  const todaysVariableExpenses = getTodaysVariableExpenses(expenses);
  const budgetAlert = dailyBudget.amount > 0 && todaysVariableExpenses > dailyBudget.amount * 0.8;

  const expenseCategoryChartData: CategoryDataPoint[] = aggregateExpensesByCategory(expenses, currentDate).slice(0, 5);
  const investmentTypeChartData: CategoryDataPoint[] = aggregateInvestmentsByType(investments, currentDate).slice(0, 5);
  const monthlyExpenseTrendData: TimeSeriesDataPoint[] = getMonthlyExpenseTrend(expenses, 6);
  const monthlyInvestmentTrendData: TimeSeriesDataPoint[] = getMonthlyInvestmentTrend(investments, 6);

  const handleSetBudget = () => {
    const amount = parseFloat(newBudgetAmount);
    if (!isNaN(amount) && amount >= 0) {
      setDailyBudget({ amount });
      setIsBudgetModalOpen(false);
    }
  };
  
  const handleSetDebt = () => {
    const amount = parseFloat(newDebtAmount);
    if (!isNaN(amount) && amount >= 0) {
      setUserDebts({ totalDebt: amount });
      setIsDebtModalOpen(false);
    }
  };

  const toggleIncomeVisibility = () => {
    setIsMonthlyIncomeVisible(!isMonthlyIncomeVisible);
  };

  const incomeVisibilityButton = (
    <button 
      onClick={toggleIncomeVisibility} 
      className="p-1 rounded-full hover:bg-base-300 focus:outline-none focus:ring-1 focus:ring-primary"
      aria-label={isMonthlyIncomeVisible ? "Hide monthly income" : "Show monthly income"}
    >
      {isMonthlyIncomeVisible ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
    </button>
  );

  const upcomingTodos = todoTasks
    .filter(task => {
      if (task.isCompleted || !task.dueDate) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(task.dueDate); // Ensure dueDate is also compared at 00:00 time for consistency
      dueDate.setHours(0,0,0,0); 
      const fourDaysFromNow = new Date(today);
      fourDaysFromNow.setDate(today.getDate() + 3); // today + 3 days = 4 day window
      return dueDate >= today && dueDate <= fourDaysFromNow;
    })
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-content">Dashboard</h1>
        <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => setIsBudgetModalOpen(true)}>Set Daily Budget</Button>
            <Button size="sm" variant="outline" onClick={() => setIsDebtModalOpen(true)}>Update Debts</Button>
        </div>
      </div>

      {budgetAlert && (
        <Card className="bg-amber-100 border border-amber-400">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 mr-3" />
            <div>
              <p className="font-semibold text-amber-700">Daily Budget Alert!</p>
              <p className="text-sm text-amber-600">
                You've spent {formatCurrency(todaysVariableExpenses)} today, which is over 80% of your daily budget of {formatCurrency(dailyBudget.amount)}.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
            title="Monthly Income" 
            value={isMonthlyIncomeVisible ? formatCurrency(monthlyIncome) : `${DEFAULT_CURRENCY}••••••`} 
            icon={<ArrowTrendingUpIcon className="w-8 h-8" />} 
            color="text-green-500"
            titleAction={incomeVisibilityButton}
            footerAction={
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setActivePage('income')} 
                className="w-full text-green-500 hover:bg-green-500/10"
                leftIcon={<PlusCircleIcon className="w-4 h-4" />}
              >
                Add Income
              </Button>
            }
        />
        <StatCard 
          title="Monthly Expenses" 
          value={formatCurrency(monthlyExpensesNum)} 
          icon={<ArrowTrendingDownIcon className="w-8 h-8" />} 
          color="text-red-500"
          footerAction={
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setActivePage('expenses')} 
              className="w-full text-red-500 hover:bg-red-500/10"
              leftIcon={<PlusCircleIcon className="w-4 h-4" />}
            >
              Add Expense
            </Button>
          }
        />
        <StatCard
            title="RupIQ AI Assistant"
            value="Chat Now"
            icon={<SparklesIcon className="w-8 h-8" />}
            color="text-indigo-500"
            description="Get instant financial advice."
            footerAction={
                <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setIsChatbotModalOpen(true)} 
                    className="w-full text-indigo-500 hover:bg-indigo-500/10"
                >
                    Open Chatbot
                </Button>
            }
        />
      </div>
      
      {upcomingTodos.length > 0 && (
        <Card title="Upcoming To-Do Reminders (Next 4 Days)">
          <ul className="space-y-2">
            {upcomingTodos.map(task => {
              const dueDate = new Date(task.dueDate!);
              dueDate.setHours(0,0,0,0); // Normalize for comparison
              const today = new Date(); today.setHours(0,0,0,0);
              const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
              
              let dateLabel = dueDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              let highlightClass = 'text-content-secondary';

              if (dueDate.getTime() === today.getTime()) {
                dateLabel = `Today, ${dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
                highlightClass = 'text-red-500 font-semibold';
              } else if (dueDate.getTime() === tomorrow.getTime()) {
                dateLabel = `Tomorrow, ${dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
                highlightClass = 'text-amber-500 font-semibold';
              }
              
              return (
                <li key={task.id} className="p-3 bg-base-100 rounded-md shadow-sm flex justify-between items-center hover:bg-base-300/50 transition-colors">
                  <span className="text-content">{task.text}</span>
                  <span className={`text-sm ${highlightClass}`}>{dateLabel}</span>
                </li>
              );
            })}
          </ul>
          <Button variant="outline" size="sm" onClick={() => setActivePage('todo')} className="mt-4 w-full">
            View All To-Dos
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Monthly Expense Breakdown (Category)">
          {expenseCategoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={expenseCategoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {expenseCategoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-content-secondary text-center py-10">No expense data for this month to display chart.</p>
          )}
        </Card>
        
        <Card title="Monthly Investment Allocation (Type)">
          {investmentTypeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={investmentTypeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {investmentTypeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-content-secondary text-center py-10">No investment data for this month to display chart.</p>
          )}
        </Card>
      </div>

      <Card title="Monthly Expense Trend (Last 6 Months)">
        {monthlyExpenseTrendData.length > 1 && monthlyExpenseTrendData.some(d => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyExpenseTrendData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => formatCurrency(value, '')} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), "Total Expenses"]} />
              <Legend />
              <Line type="monotone" dataKey="value" name="Total Expenses" stroke={CHART_COLORS[1]} strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-content-secondary text-center py-10">Not enough data to display monthly expense trend. Keep tracking your expenses!</p>
        )}
      </Card>

      <Card title="Monthly Investment Trend (Last 6 Months)">
        {monthlyInvestmentTrendData.length > 1 && monthlyInvestmentTrendData.some(d => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyInvestmentTrendData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => formatCurrency(value, '')} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), "Total Investments"]} />
              <Legend />
              <Line type="monotone" dataKey="value" name="Total Investments" stroke={CHART_COLORS[2]} strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-content-secondary text-center py-10">Not enough data to display monthly investment trend. Keep tracking your investments!</p>
        )}
      </Card>
      
       <Card title="Quick Actions">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="secondary" onClick={() => setActivePage('income')}>Add Income</Button>
            <Button variant="danger" onClick={() => setActivePage('expenses')}>Add Expense</Button>
            <Button variant="primary" onClick={() => setActivePage('investments')}>Add Investment</Button>
            <Button variant="outline" onClick={() => setActivePage('goals')}>Set a Goal</Button>
          </div>
        </Card>

      <Modal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} title="Set Daily Budget">
        <Input
          label="Daily Budget Amount"
          type="number"
          value={newBudgetAmount}
          onChange={(e) => setNewBudgetAmount(e.target.value)}
          placeholder={`Enter amount in ${DEFAULT_CURRENCY}`}
        />
        <Button onClick={handleSetBudget} className="w-full">Set Budget</Button>
      </Modal>

      <Modal isOpen={isDebtModalOpen} onClose={() => setIsDebtModalOpen(false)} title="Update Total Debts">
        <Input
          label="Total Outstanding Debt"
          type="number"
          value={newDebtAmount}
          onChange={(e) => setNewDebtAmount(e.target.value)}
          placeholder={`Enter total debt in ${DEFAULT_CURRENCY}`}
        />
        <Button onClick={handleSetDebt} className="w-full">Update Debts</Button>
      </Modal>

      <Modal isOpen={isChatbotModalOpen} onClose={() => setIsChatbotModalOpen(false)} title="RupIQ AI Chatbot" size="lg">
        <RupIqChatbot />
      </Modal>

    </div>
  );
};

export default Dashboard;
