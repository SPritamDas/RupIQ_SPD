
import { IncomeCategory, ExpenseCategory, InvestmentType, ExpenseType } from './types';

export const APP_NAME = "RupIQ";

export const INCOME_CATEGORIES: IncomeCategory[] = Object.values(IncomeCategory);
export const EXPENSE_CATEGORIES: ExpenseCategory[] = Object.values(ExpenseCategory);
export const EXPENSE_TYPES: ExpenseType[] = Object.values(ExpenseType);
export const INVESTMENT_TYPES: InvestmentType[] = Object.values(InvestmentType);

export const DEFAULT_CURRENCY = "₹"; // INR Rupee Symbol

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', path: 'dashboard', icon: 'ChartPieIcon' },
  { name: 'Income', path: 'income', icon: 'ArrowTrendingUpIcon' },
  { name: 'Expenses', path: 'expenses', icon: 'ArrowTrendingDownIcon' },
  { name: 'Investments', path: 'investments', icon: 'BanknotesIcon' },
  { name: 'Goals', path: 'goals', icon: 'TrophyIcon' },
  { name: 'Splitter', path: 'splitter', icon: 'UserGroupIcon' },
  { name: 'Calculators', path: 'calculators', icon: 'CalculatorIcon' },
  { name: 'To-Do', path: 'todo', icon: 'CheckBadgeIcon' },
  { name: 'RupIQ AI', path: 'ai-insights', icon: 'SparklesIcon' },
];

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';

export const MOCK_API_KEY_NOTICE = "process.env.API_KEY is not set. Using a mock API key for demonstration. AI features will be simulated.";

// Chart colors (Tailwind compatible)
export const CHART_COLORS = [
  '#4F46E5', // primary
  '#10B981', // secondary
  '#F59E0B', // accent
  '#EC4899', // pink-500
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#D946EF', // fuchsia-500
  '#14B8A6', // teal-500
];