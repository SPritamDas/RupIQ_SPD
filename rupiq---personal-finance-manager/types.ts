
export enum IncomeCategory {
  SALARY = 'Salary',
  RENTAL = 'Rental Income',
  BUSINESS = 'Business Profit',
  INVESTMENT = 'Investment Returns',
  FREELANCE = 'Freelance',
  OTHER = 'Other',
}

export interface IncomeItem {
  id: string;
  date: string;
  category: IncomeCategory;
  amount: number;
  description: string;
}

export enum ExpenseCategory {
  FOOD = 'Food & Groceries',
  ACCOMMODATION = 'Accommodation',
  TRANSPORTATION = 'Transportation',
  UTILITIES = 'Utilities',
  HEALTHCARE = 'Healthcare',
  ENTERTAINMENT = 'Entertainment',
  SHOPPING = 'Shopping',
  EDUCATION = 'Education',
  DEBT_REPAYMENT = 'Debt Repayment',
  PERSONAL_CARE = 'Personal Care',
  OTHER = 'Other',
}

export enum ExpenseType {
  FIXED = 'Fixed',
  VARIABLE = 'Variable',
}

export interface SplitDetail {
  friendName: string;
  amount: number;
  // isPaid: boolean; // Removed: Settlement handled globally in SplitterLedger
}

export interface ExpenseItem {
  id: string;
  date: string;
  category: ExpenseCategory;
  type: ExpenseType;
  amount: number; // If split, this will be "My Share"
  description: string;
  isSplit: boolean;
  splitDetails?: SplitDetail[];
  originalTotalAmount?: number; // Stores the grand total of the bill if isSplit is true
}

export enum InvestmentType {
  STOCKS = 'Stocks',
  MUTUAL_FUNDS_SIP = 'Mutual Funds (SIP)',
  FIXED_DEPOSIT = 'Fixed Deposit (FD)',
  CRYPTO = 'Cryptocurrency',
  P2P_LENDING = 'P2P Lending',
  REAL_ESTATE = 'Real Estate',
  GOLD = 'Gold',
  OTHER = 'Other',
}

export interface InvestmentItem {
  id: string;
  date: string;
  type: InvestmentType;
  name: string; // e.g., Stock Ticker, MF Name, Crypto Name
  amountInvested: number;
  currentValue: number;
  platform?: string;
}

export interface TodoTask {
  id: string;
  text: string;
  isCompleted: boolean;
  dueDate?: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  description?: string;
}

export interface SplitEventParticipant {
  name: string;
  share: number; // How much this person is responsible for
  paid: number; // Amount this person paid towards the event's totalAmount
}

export interface SplitEvent {
  id: string;
  description: string;
  date: string;
  totalAmount: number;
  paidBy: string; // Name of primary person(s) who paid initially (informational for quick view)
  participants: SplitEventParticipant[];
}

export interface DailyBudget {
  amount: number;
}

export interface UserDebts {
  totalDebt: number;
}

// For Charting
export interface CategoryDataPoint {
  name: string;
  value: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

// For RupIQ AI Chatbot
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isLoading?: boolean; // True if model is generating this message part
}
