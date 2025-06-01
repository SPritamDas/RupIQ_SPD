
import { IncomeItem, ExpenseItem, InvestmentItem, ExpenseType, FinancialGoal, UserDebts, DailyBudget, ExpenseCategory, CategoryDataPoint, IncomeCategory, InvestmentType, TimeSeriesDataPoint } from '../types';
import { DEFAULT_CURRENCY } from '../constants';

export const calculateTotal = (items: Array<{ amount: number }>): number => {
  return items.reduce((sum, item) => sum + item.amount, 0);
};

export const filterByMonth = <T extends { date: string }>(items: T[], date: Date): T[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return items.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate.getFullYear() === year && itemDate.getMonth() === month;
  });
};

export const getMonthlyIncome = (incomes: IncomeItem[], date: Date): number => {
  const monthlyIncomes = filterByMonth(incomes, date);
  return calculateTotal(monthlyIncomes);
};

export const getMonthlyExpenses = (expenses: ExpenseItem[], date: Date): number => {
  const monthlyExpenses = filterByMonth(expenses, date);
  return calculateTotal(monthlyExpenses);
};

export const getMonthlyInvestmentsTotal = (investments: InvestmentItem[], date: Date): number => {
  const monthlyData = filterByMonth(investments, date);
  return monthlyData.reduce((sum, item) => sum + item.amountInvested, 0);
};

export const getTodaysVariableExpenses = (expenses: ExpenseItem[]): number => {
  const today = new Date().toISOString().split('T')[0];
  return expenses
    .filter(e => e.date === today && e.type === ExpenseType.VARIABLE)
    .reduce((sum, e) => sum + e.amount, 0);
};

export const calculateSavingsRate = (monthlyIncome: number, monthlyExpenses: number): number => {
  if (monthlyIncome === 0) return 0;
  const savings = monthlyIncome - monthlyExpenses;
  return (savings / monthlyIncome) * 100;
};

export const calculateNetWorth = (investments: InvestmentItem[], savings: number, debts: UserDebts): number => {
  const totalInvestmentValue = investments.reduce((sum, item) => sum + item.currentValue, 0);
  // Assuming savings is cash on hand or easily accessible funds not yet invested
  return totalInvestmentValue + savings - debts.totalDebt;
};

export const calculateDebtToIncomeRatio = (totalDebt: number, monthlyGrossIncome: number): number => {
  if (monthlyGrossIncome === 0) return 0; // or Infinity, or handle as error
  return (totalDebt / monthlyGrossIncome) * 100;
};

export const calculateCashToInvestmentRatio = (cashSavings: number, totalInvestmentValue: number): string => {
  if (totalInvestmentValue === 0 && cashSavings === 0) return "N/A";
  if (totalInvestmentValue === 0) return "Infinite (All Cash)";
  if (cashSavings === 0 && totalInvestmentValue > 0) return `0 : 1.00`;

  // const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b)); // Removed unused gcd
  
  let cashPart = 1;
  let investmentPart = totalInvestmentValue / cashSavings;

  if (investmentPart < 0.01 && cashSavings > 0) { 
    investmentPart = 1;
    cashPart = cashSavings / totalInvestmentValue;
    return `${cashPart.toFixed(2)} : 1`;
  }
  
  return `1 : ${investmentPart.toFixed(2)}`; // Cash : Investment
};


export const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  return `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const calculateSIPFutureValue = (principal: number, rate: number, time: number, monthlyInvestment: number): number => {
  // P * (((1 + i)^n - 1) / i) * (1 + i)
  // For SIP, rate is annual, time is in years. Convert to monthly.
  const monthlyRate = rate / 12 / 100;
  const numMonths = time * 12;
  if (monthlyRate === 0) return monthlyInvestment * numMonths; // if rate is 0
  const futureValue = monthlyInvestment * ((Math.pow(1 + monthlyRate, numMonths) - 1) / monthlyRate) * (1 + monthlyRate);
  return futureValue;
};

export const calculateSWPAmount = (principal: number, withdrawalRate: number, frequency: 'monthly' | 'yearly' = 'monthly'): number => {
  // Simplified SWP for regular withdrawal amount
  // This assumes withdrawal rate is annual percentage of principal
  const annualWithdrawal = principal * (withdrawalRate / 100);
  return frequency === 'monthly' ? annualWithdrawal / 12 : annualWithdrawal;
};

export const aggregateExpensesByCategory = (expenses: ExpenseItem[], date: Date): CategoryDataPoint[] => {
    const monthlyExpenses = filterByMonth(expenses, date);
    const categoryMap: Record<ExpenseCategory, number> = {} as Record<ExpenseCategory, number>;

    for (const expense of monthlyExpenses) {
        if (!categoryMap[expense.category]) {
            categoryMap[expense.category] = 0;
        }
        categoryMap[expense.category] += expense.amount;
    }

    return Object.entries(categoryMap)
        .map(([name, value]) => ({ name: name as ExpenseCategory, value }))
        .sort((a, b) => b.value - a.value);
};

export const aggregateIncomesByCategory = (incomes: IncomeItem[], date: Date): CategoryDataPoint[] => {
    const monthlyIncomes = filterByMonth(incomes, date);
    const categoryMap: Record<IncomeCategory, number> = {} as Record<IncomeCategory, number>;

    for (const income of monthlyIncomes) {
        if (!categoryMap[income.category]) {
            categoryMap[income.category] = 0;
        }
        categoryMap[income.category] += income.amount;
    }

    return Object.entries(categoryMap)
        .map(([name, value]) => ({ name: name as IncomeCategory, value }))
        .sort((a, b) => b.value - a.value);
};

export const aggregateInvestmentsByType = (investments: InvestmentItem[], date: Date): CategoryDataPoint[] => {
    const monthlyInvestments = filterByMonth(investments, date); 
    const typeMap: Record<InvestmentType, number> = {} as Record<InvestmentType, number>;


    const relevantInvestments = filterByMonth(investments, date); 

    for (const investment of relevantInvestments) { 
        if (!typeMap[investment.type]) {
            typeMap[investment.type] = 0;
        }
        typeMap[investment.type] += investment.currentValue;
    }

    return Object.entries(typeMap)
        .map(([name, value]) => ({ name: name as InvestmentType, value }))
        .sort((a, b) => b.value - a.value);
};

export const getMonthlyExpenseTrend = (expenses: ExpenseItem[], numberOfMonths: number = 6): TimeSeriesDataPoint[] => {
    const trendData: TimeSeriesDataPoint[] = [];
    const today = new Date();

    for (let i = numberOfMonths - 1; i >= 0; i--) {
        const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthExpenses = filterByMonth(expenses, targetDate);
        const totalMonthExpense = calculateTotal(monthExpenses);
        
        trendData.push({
            date: targetDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            value: totalMonthExpense
        });
    }
    return trendData;
};

export const getMonthlyInvestmentTrend = (investments: InvestmentItem[], numberOfMonths: number = 6): TimeSeriesDataPoint[] => {
    const trendData: TimeSeriesDataPoint[] = [];
    const today = new Date();

    for (let i = numberOfMonths - 1; i >= 0; i--) {
        const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthInvestments = investments.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.getFullYear() === targetDate.getFullYear() && itemDate.getMonth() === targetDate.getMonth();
        });
        
        const totalMonthInvestment = monthInvestments.reduce((sum, item) => sum + item.amountInvested, 0);
        
        trendData.push({
            date: targetDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            value: totalMonthInvestment
        });
    }
    return trendData;
};
