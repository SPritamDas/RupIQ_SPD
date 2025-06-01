
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { GEMINI_TEXT_MODEL, MOCK_API_KEY_NOTICE } from '../constants';
import { IncomeItem, ExpenseItem, InvestmentItem, FinancialGoal, UserDebts, SplitEvent, TodoTask } from "../types";
import { getMonthlyIncome, getMonthlyExpenses, calculateTotal, aggregateExpensesByCategory, formatCurrency } from "./financeService";

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.warn(MOCK_API_KEY_NOTICE);
}

// Interfaces for structured AI Savings Plan (used by GoalBudgeting)
export interface AISavingsPlanBreakdown {
  goalName: string;
  remainingAmount: number;
  monthsLeft: number;
  impliedMonthlySaving: number;
  suggestedMonthlySaving: number;
  priority: 'High' | 'Medium' | 'Low' | 'N/A' | string;
  notes: string;
}

export interface AISavingsPlanResponse {
  totalEstimatedMonthlySavingsNeeded: number;
  incomeSufficiency: 'Sufficient' | 'Tight' | 'Insufficient' | 'Consider Review' | 'N/A' | string;
  overallAdvice: string;
  goalBreakdown: AISavingsPlanBreakdown[];
}


const formatFinancialDataForPrompt = (
  incomes: IncomeItem[],
  expenses: ExpenseItem[],
  investments: InvestmentItem[],
  goals: FinancialGoal[],
  userDebts: UserDebts,
  splitEvents: SplitEvent[],
  todoTasks: TodoTask[],
  currentDate: Date
): string => {
  const monthlyIncome = getMonthlyIncome(incomes, currentDate);
  const monthlyExpensesNum = getMonthlyExpenses(expenses, currentDate);
  const netMonthlySavings = monthlyIncome - monthlyExpensesNum;
  const savingsRate = monthlyIncome > 0 ? (netMonthlySavings / monthlyIncome) * 100 : 0;

  const topExpenseCategories = aggregateExpensesByCategory(expenses, currentDate).slice(0, 5);
  const totalInvested = calculateTotal(investments.map(inv => ({ amount: inv.amountInvested })));
  const currentInvestmentValue = calculateTotal(investments.map(inv => ({ amount: inv.currentValue })));
  const investmentPL = currentInvestmentValue - totalInvested;
  const investmentPLPercentage = totalInvested > 0 ? (investmentPL / totalInvested) * 100 : 0;

  // Splitter Summary
  let friendBalances: { name: string, balance: number }[] = [];
  splitEvents.forEach(event => {
    event.participants.forEach(p => {
      if (p.name.toLowerCase() !== 'me') {
        const balanceEffect = p.paid - p.share;
        const existingFriend = friendBalances.find(fb => fb.name === p.name);
        if (existingFriend) {
          existingFriend.balance += balanceEffect;
        } else {
          friendBalances.push({ name: p.name, balance: balanceEffect });
        }
      }
    });
  });
  const totalOwedToUser = friendBalances.filter(fb => fb.balance < 0).reduce((sum, fb) => sum + Math.abs(fb.balance), 0);
  const totalUserOwes = friendBalances.filter(fb => fb.balance > 0).reduce((sum, fb) => sum + fb.balance, 0);

  const financialKeywords = ['bill', 'payment', 'invest', 'finance', 'debt', 'loan', 'stock', 'mutual fund', 'sip'];
  const financialTodos = todoTasks.filter(task => !task.isCompleted && financialKeywords.some(kw => task.text.toLowerCase().includes(kw)));


  let prompt = `User's Detailed Financial Profile (Current Month: ${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}):

## Income Overview:
- Total Monthly Income: ${formatCurrency(monthlyIncome)}
- Income Sources: ${incomes.length > 0 ? incomes.map(i => i.category).filter((v, i, a) => a.indexOf(v) === i).join(', ') : 'Not specified'}

## Expense Overview:
- Total Monthly Expenses: ${formatCurrency(monthlyExpensesNum)}
- Top Expense Categories (Month):`;
  if (topExpenseCategories.length > 0) {
    topExpenseCategories.forEach(cat => {
      prompt += `\n  - ${cat.name}: ${formatCurrency(cat.value)}`;
    });
  } else {
    prompt += `\n  - No significant expenses recorded this month.`;
  }

  prompt += `

## Savings & Net Worth:
- Net Monthly Savings: ${formatCurrency(netMonthlySavings)}
- Monthly Savings Rate: ${savingsRate.toFixed(2)}%
- Total Debt: ${formatCurrency(userDebts.totalDebt)}

## Investment Portfolio:
- Total Amount Invested (Cost): ${formatCurrency(totalInvested)}
- Current Investment Portfolio Value: ${formatCurrency(currentInvestmentValue)}
- Overall Portfolio P/L: ${formatCurrency(investmentPL)} (${investmentPLPercentage.toFixed(2)}%)
- Investment Types Held Summary:`;
  if (investments.length > 0) {
    const investmentTypesSummary = investments.reduce((acc, inv) => {
      acc[inv.type] = (acc[inv.type] || 0) + inv.currentValue;
      return acc;
    }, {} as Record<string, number>);
    for (const type in investmentTypesSummary) {
      prompt += `\n  - ${type}: ${formatCurrency(investmentTypesSummary[type])}`;
    }
  } else {
    prompt += `\n  - No investments recorded.`;
  }

  prompt += `

## Financial Goals:`;
  if (goals.length > 0) {
    goals.forEach(goal => {
      const remaining = goal.targetAmount - goal.currentAmount;
      const daysLeft = Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
      prompt += `\n  - Goal: "${goal.name}", Target: ${formatCurrency(goal.targetAmount)}, Saved: ${formatCurrency(goal.currentAmount)}, Remaining: ${formatCurrency(remaining)}, Deadline: ${new Date(goal.targetDate).toLocaleDateString()} (${daysLeft} days left).`;
    });
  } else {
    prompt += `\n  - No specific financial goals set yet.`;
  }
  
  prompt += `

## Group Expenses & Splits:
- Net Amount Owed to User by Friends: ${formatCurrency(totalOwedToUser)}
- Net Amount User Owes to Friends: ${formatCurrency(totalUserOwes)}
`;

  if (financialTodos.length > 0) {
    prompt += `

## Pending Financial To-Do Items:`;
    financialTodos.slice(0,3).forEach(task => {
        prompt += `\n  - ${task.text} ${task.dueDate ? `(Due: ${new Date(task.dueDate).toLocaleDateString()})` : ''}`;
    });
  }

  return prompt;
};


export const getFinancialSuggestions = async (
  incomes: IncomeItem[],
  expenses: ExpenseItem[],
  investments: InvestmentItem[],
  goals: FinancialGoal[],
  userDebts: UserDebts,
  splitEvents: SplitEvent[],
  todoTasks: TodoTask[]
): Promise<string> => {
  if (!ai) {
    return Promise.resolve(`AI suggestions are unavailable because the API key is not configured. 
Based on general best practices:
1. Create a detailed budget: Track all income and expenses for a month to understand your cash flow.
2. Build an emergency fund: Aim for 3-6 months of living expenses in an easily accessible account.
3. Review and reduce debt: Prioritize high-interest debt repayment.
4. Set clear financial goals: Define short-term and long-term goals (e.g., buying a house, retirement).
5. Start investing early: Even small amounts can grow significantly over time due to compounding.

---
Key Questions for Deeper Insight:
---
1. What is your approximate age and current city/region of residence (this helps understand cost of living and life stage)?
2. Could you describe your household situation (e.g., living alone, number of dependents)? This impacts financial planning significantly.
3. How stable is your primary income source, and how long have you been in your current job?
4. What is your general risk tolerance for investments (e.g., low, medium, high)?
5. Are there any specific financial concerns or areas you'd like to focus on improving right now?`);
  }

  const detailedProfile = formatFinancialDataForPrompt(incomes, expenses, investments, goals, userDebts, splitEvents, todoTasks, new Date());

  const prompt = `You are RupIQ, a professional and insightful personal finance analyst.
Perform a comprehensive, user-specific financial health analysis based on the detailed financial profile provided below.
Your analysis should cover aspects like income, expenses, savings, investments, debt, and progress towards goals.
Provide actionable recommendations and explain your reasoning clearly. Structure your analysis with clear paragraphs or bullet points.

After your analysis, add a distinct section titled:
---
Key Questions for Deeper Insight:
---
Under this title, list 3-5 specific clarifying questions you would ask this user to gain an even deeper understanding of their situation and provide more tailored advice in the future. These questions should target areas where more information would be most impactful, potentially including topics like their specific location (city/region for cost of living), household situation (dependents), job stability, risk tolerance not explicitly stated, or willingness to change certain financial habits.

User's Detailed Financial Profile:
${detailedProfile}

Begin your analysis now:`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error fetching general financial suggestions from Gemini API:", error);
    if (error instanceof Error && error.message.includes("API key not valid")) {
         return "Failed to get AI suggestions: The API key is not valid. Please check your configuration.";
    }
    return "Sorry, I couldn't fetch general financial suggestions at this moment. Please try again later.";
  }
};

// Types for Investment Portfolio Optimizer
export interface UserAssetPreference {
  id?: string; // id is used for UI keying, optional for the service call itself
  name: string; 
  expectedGrowth: number; 
  riskScore: number; 
  duration: string; 
}

export interface PortfolioOptimizationParams {
  totalInvestmentAmount: number; 
  assetPreferences: UserAssetPreference[];
  overallRiskScore: number; 
  customPreferences: string; 
}

export interface PortfolioAllocationItem {
  assetClass: string; 
  percentage: number; 
}
export interface PortfolioOptimizationResponse {
  suggestedAllocations: PortfolioAllocationItem[];
  reasoning: string;
}

export const getInvestmentOptimizationSuggestions = async (
  params: PortfolioOptimizationParams
): Promise<PortfolioOptimizationResponse> => {
  if (!ai) {
    console.warn(MOCK_API_KEY_NOTICE + " Portfolio optimization will be mocked.");
    let mockAllocations = [
        { assetClass: "Mock Stocks", percentage: 50 },
        { assetClass: "Mock Bonds", percentage: 30 },
        { assetClass: "Mock Cash", percentage: 20 }
    ];
    let mockReasoning = "This is a mock portfolio suggestion as the API key is not configured. It provides a general diversified allocation. ";

    mockReasoning += `User plans to invest a total of ${params.totalInvestmentAmount}. `
    mockReasoning += `Overall risk score is ${params.overallRiskScore}. `;

    if (params.overallRiskScore <= 3) { 
        mockAllocations = [ { assetClass: "Mock Bonds", percentage: 60 }, { assetClass: "Mock Fixed Deposits", percentage: 30 }, { assetClass: "Mock Cash", percentage: 10 }];
        mockReasoning += "Low overall risk tolerance favors capital preservation.";
    } else if (params.overallRiskScore >= 8) { 
         mockAllocations = [ { assetClass: "Mock Growth Stocks", percentage: 70 }, { assetClass: "Mock Crypto", percentage: 20 }, { assetClass: "Mock P2P Lending", percentage: 10 } ];
        mockReasoning += "High overall risk tolerance allows for more aggressive growth assets.";
    }
    
    if (params.assetPreferences.length > 0) {
        mockReasoning += `\nUser is considering investing in assets like ${params.assetPreferences.map(ap => `${ap.name} (expects ${ap.expectedGrowth}% growth, risk ${ap.riskScore}, duration ${ap.duration})`).join(', ')}. `;
    }
    if (params.customPreferences) {
        mockReasoning += `\nUser's custom preferences ("${params.customPreferences.substring(0,50)}...") were noted for this mock response.`
    }

    return Promise.resolve({ suggestedAllocations: mockAllocations, reasoning: mockReasoning });
  }

  let userAssetsPrompt = "The user is considering investing in the following specific asset types. For each, they've provided details:\n";
  if (params.assetPreferences.length > 0) {
    params.assetPreferences.forEach(asset => {
      userAssetsPrompt += `- Asset Type: ${asset.name}\n`;
      userAssetsPrompt += `  - User's Expected Annual Growth for this Asset: ${asset.expectedGrowth}%\n`;
      userAssetsPrompt += `  - User's Perceived Risk for this Asset (1-10): ${asset.riskScore}\n`;
      userAssetsPrompt += `  - User's Intended Holding Duration for this Asset: "${asset.duration}"\n`;
    });
  } else {
    userAssetsPrompt += "- No specific asset preferences detailed by the user (frontend should ensure at least one asset is detailed if this section is used).\n";
  }

  const prompt = `
    You are RupIQ, an expert financial advisor AI.
    A user wants a suggested percentage allocation for a new investment portfolio.

    User's Profile and Investment Plan:
    - Total Amount to Invest Across Entire Portfolio: ${params.totalInvestmentAmount}
    - Overall Risk Tolerance Score for Entire Portfolio: ${params.overallRiskScore} (1=very low risk, 10=very high risk).
${userAssetsPrompt}
    - Custom Allocation Preferences/Rules (interpret these text-based rules for the overall portfolio): "${params.customPreferences || "No specific custom preferences provided."}"
      (Example user rules: "Prioritize high growth if overall risk > 7", "If overall risk is low, cap equities at 30%", "Limit total crypto exposure to 10% of portfolio")

    Task:
    Based on ALL the information above, provide:
    1. A suggested diversified portfolio allocation. This allocation MUST be represented as *percentages* for different relevant asset classes, and these percentages must sum to 100%.
       - The percentages refer to how the 'Total Amount to Invest Across Entire Portfolio' should be distributed.
       - Choose which of the asset types detailed by the user are suitable for inclusion. You can also suggest other common asset classes for diversification if appropriate (e.g., Gold, Real Estate ETFs), even if not explicitly detailed by the user, but prioritize those the user showed interest in.
       - Your allocation strategy should reflect the user's 'Overall Risk Tolerance Score'.
       - Consider the user's details for each specific asset type (their 'Expected Annual Growth', 'Perceived Risk for this Asset', and 'Intended Holding Duration') as strong indicators of their interest, capacity, and views on those assets. These details should influence which assets are included and their respective percentages. For example, an asset with favorable user metrics might get a larger share if it aligns with the overall risk.
       - Critically, interpret and apply any logic described in their "Custom Allocation Preferences/Rules" to the overall portfolio construction.

    2. Detailed reasoning (3-5 paragraphs) for your suggested percentage allocations. Explain:
       - How the allocation aligns with the 'Total Amount to Invest' and the user's 'Overall Risk Tolerance Score'.
       - How it incorporates their preferences for specific asset types (considering their growth, risk, duration for each).
       - How it reflects any "Custom Allocation Preferences/Rules" they provided.
       - Why certain asset classes were chosen at specific percentages.

    IMPORTANT: Respond ONLY with a valid JSON object in the following format. Do not include any text before or after the JSON object, and no markdown.
    The JSON object should look like this:
    {
      "suggestedAllocations": [
        {"assetClass": "Asset Class Name 1", "percentage": PercentageValue1AsNumber},
        {"assetClass": "Asset Class Name 2", "percentage": PercentageValue2AsNumber}
      ],
      "reasoning": "Your detailed reasoning here..."
    }

    Example for "suggestedAllocations" (ensure percentages sum to 100):
    [
      {"assetClass": "Indian Large-Cap Stocks", "percentage": 40},
      {"assetClass": "Global Equity ETF", "percentage": 20},
      {"assetClass": "Corporate Bonds", "percentage": 25},
      {"assetClass": "Gold ETF", "percentage": 10},
      {"assetClass": "Cryptocurrency (BTC/ETH)", "percentage": 5}
    ]
    The "percentage" value must be a number, not a string.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr) as PortfolioOptimizationResponse;
    
    if (!parsedData.suggestedAllocations || !Array.isArray(parsedData.suggestedAllocations) || !parsedData.reasoning || typeof parsedData.reasoning !== 'string') {
        console.error("AI response structure is invalid:", parsedData);
        throw new Error("AI response is not in the expected JSON format regarding structure.");
    }

    let totalPercentage = 0;
    for (const item of parsedData.suggestedAllocations) {
        if (typeof item.assetClass !== 'string' || typeof item.percentage !== 'number' || item.percentage < 0) {
            console.error("Invalid item in suggestedAllocations:", item);
            throw new Error("AI response contains invalid allocation items.");
        }
        totalPercentage += item.percentage;
    }

    if (Math.abs(totalPercentage - 100) > 0.5) { 
        console.warn(`AI suggested percentages sum to ${totalPercentage.toFixed(2)}, not 100. Adjusting to normalize... Response:`, parsedData);
        if (totalPercentage > 0) { 
            parsedData.suggestedAllocations = parsedData.suggestedAllocations.map(item => ({
                ...item,
                percentage: parseFloat(((item.percentage / totalPercentage) * 100).toFixed(1)) 
            }));
             let normalizedTotal = parsedData.suggestedAllocations.reduce((sum, item) => sum + item.percentage, 0);
             if (Math.abs(normalizedTotal - 100) > 0.01 && parsedData.suggestedAllocations.length > 0) {
                 const diff = 100 - normalizedTotal;
                 parsedData.suggestedAllocations.sort((a,b) => b.percentage - a.percentage); 
                 parsedData.suggestedAllocations[0].percentage = parseFloat((parsedData.suggestedAllocations[0].percentage + diff).toFixed(1));
             }
        } 
    } 
    return parsedData;
  } catch (error) {
    console.error("Error fetching investment optimization from Gemini API:", error);
    let errorMessage = "Sorry, I couldn't fetch investment optimization suggestions at this moment. Please try again later.";
    if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
            errorMessage = "Failed to get AI suggestions: The API key is not valid. Please check your configuration.";
        } else if (error instanceof SyntaxError || error.message.toLowerCase().includes("json")) {
            errorMessage = "Failed to parse AI response. The AI may not have returned valid JSON as requested. Please try again.";
        } else if (error.message.includes("expected JSON format") || error.message.includes("invalid allocation items")) { 
             errorMessage = error.message; 
        }
    }
    throw new Error(errorMessage);
  }
};


export const getMultiGoalSavingsSuggestion = async (
  goals: FinancialGoal[],
  monthlyIncome: number
): Promise<AISavingsPlanResponse> => {
  if (!ai) {
    const mockGoalBreakdown: AISavingsPlanBreakdown[] = goals.map(g => {
        const remaining = g.targetAmount - g.currentAmount;
        const today = new Date();
        const targetDate = new Date(g.targetDate);
        const months = Math.max(1, (targetDate.getFullYear() - today.getFullYear()) * 12 + targetDate.getMonth() - today.getMonth());
        return {
            goalName: g.name,
            remainingAmount: remaining,
            monthsLeft: months,
            impliedMonthlySaving: remaining > 0 ? parseFloat((remaining / months).toFixed(2)) : 0,
            suggestedMonthlySaving: remaining > 0 ? parseFloat((remaining / months * 0.8).toFixed(2)) :0, // Mock suggestion
            priority: 'Medium',
            notes: "Mock suggestion: Focus on consistent saving. This is a simulated plan."
        };
    });
    const mockTotalNeeded = mockGoalBreakdown.reduce((sum, gb) => sum + gb.suggestedMonthlySaving, 0);
    return Promise.resolve({
      totalEstimatedMonthlySavingsNeeded: mockTotalNeeded,
      incomeSufficiency: monthlyIncome > mockTotalNeeded ? 'Sufficient' : 'Tight',
      overallAdvice: "This is a mock AI savings plan because the API key is not configured. Prioritize goals based on urgency and available income. Consider increasing income or reducing non-essential expenses if savings targets are hard to meet.",
      goalBreakdown: mockGoalBreakdown,
    });
  }

  let goalsPromptPart = "User's Financial Goals (all amounts in the same currency as income):\n";
  if (goals.length > 0) {
    goals.forEach(goal => {
      const remainingAmount = goal.targetAmount - goal.currentAmount;
      const targetDate = new Date(goal.targetDate);
      const today = new Date();
      const monthsLeft = Math.max(1, (targetDate.getFullYear() - today.getFullYear()) * 12 + targetDate.getMonth() - today.getMonth());
      goalsPromptPart += `- Goal: "${goal.name}"\n`;
      goalsPromptPart += `  - Target Amount: ${goal.targetAmount.toFixed(2)}\n`;
      goalsPromptPart += `  - Currently Saved: ${goal.currentAmount.toFixed(2)}\n`;
      goalsPromptPart += `  - Amount Remaining: ${remainingAmount.toFixed(2)}\n`;
      goalsPromptPart += `  - Target Date: ${targetDate.toLocaleDateString()}\n`;
      goalsPromptPart += `  - Months Left: Approximately ${monthsLeft}\n`;
      if (remainingAmount > 0 && monthsLeft > 0) {
        goalsPromptPart += `  - Implied Monthly Saving for this goal: ${(remainingAmount / monthsLeft).toFixed(2)}\n`;
      }
    });
  } else {
    goalsPromptPart += "- No specific financial goals set yet.\n";
  }

  const prompt = `
    You are RupIQ, an expert financial planning AI.
    A user wants a savings plan to achieve their multiple financial goals.

    User's Context:
    - Stated Monthly Income: ${monthlyIncome.toFixed(2)}
${goalsPromptPart}

    Task:
    Based on the user's stated monthly income and their list of financial goals, provide a comprehensive savings plan.
    Respond ONLY with a valid JSON object in the following format. Do not include any text before or after the JSON object, and no markdown.
    The JSON object MUST conform to this structure:
    {
      "totalEstimatedMonthlySavingsNeeded": number, // Sum of 'suggestedMonthlySaving' from goalBreakdown
      "incomeSufficiency": "Sufficient" | "Tight" | "Insufficient" | "Consider Review", // Your assessment
      "overallAdvice": "string", // 3-5 sentences summarizing the plan, advice, and encouragement.
      "goalBreakdown": [
        {
          "goalName": "string", // Name of the goal
          "remainingAmount": number, // Target amount - current amount
          "monthsLeft": number, // Approximate months until targetDate
          "impliedMonthlySaving": number, // remainingAmount / monthsLeft
          "suggestedMonthlySaving": number, // Your suggested monthly saving for this goal, considering income and priority. This might differ from implied.
          "priority": "High" | "Medium" | "Low" | "N/A", // Your recommended priority
          "notes": "string" // 1-2 sentences of specific advice or notes for this goal.
        }
        // ... more goal objects if applicable
      ]
    }

    Guidelines for your JSON response:
    - For 'totalEstimatedMonthlySavingsNeeded': Calculate this as the sum of all 'suggestedMonthlySaving' amounts you recommend in the 'goalBreakdown'.
    - For 'incomeSufficiency': Assess if the 'totalEstimatedMonthlySavingsNeeded' is manageable with the user's 'monthlyIncome'.
    - For 'overallAdvice': Provide a concise summary. If income is insufficient, suggest strategies like prioritization, extending timelines, increasing income, or reducing other expenses.
    - For each item in 'goalBreakdown':
        - 'goalName', 'remainingAmount', 'monthsLeft', 'impliedMonthlySaving' should be derived from the input.
        - 'suggestedMonthlySaving': This is your key recommendation. It can be equal to 'impliedMonthlySaving' if income allows, or adjusted based on prioritization. Ensure the sum of these suggested savings equals 'totalEstimatedMonthlySavingsNeeded'.
        - 'priority': Assign based on urgency (monthsLeft) and overall financial picture.
        - 'notes': Provide brief, actionable advice for each goal. For example, "Aggressively save for this short-term goal" or "Consider extending timeline if income is tight."
    - Ensure all numerical values are numbers, not strings.
    - Ensure the 'goalBreakdown' array contains an object for each goal provided by the user. If no goals, this array can be empty.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr) as AISavingsPlanResponse;

    // Basic validation of the parsed structure
    if (!parsedData || typeof parsedData.totalEstimatedMonthlySavingsNeeded !== 'number' ||
        !parsedData.incomeSufficiency || typeof parsedData.overallAdvice !== 'string' ||
        !Array.isArray(parsedData.goalBreakdown)) {
        console.error("AI response for savings plan has invalid structure:", parsedData);
        throw new Error("AI response is not in the expected JSON format for savings plan.");
    }
    // Further validation for goalBreakdown items
    for (const item of parsedData.goalBreakdown) {
        if (typeof item.goalName !== 'string' || typeof item.remainingAmount !== 'number' ||
            typeof item.monthsLeft !== 'number' || typeof item.impliedMonthlySaving !== 'number' ||
            typeof item.suggestedMonthlySaving !== 'number' || typeof item.priority !== 'string' ||
            typeof item.notes !== 'string') {
            console.error("Invalid item in AI savings plan goalBreakdown:", item);
            throw new Error("AI response contains invalid items in goalBreakdown.");
        }
    }
    return parsedData;

  } catch (error) {
    console.error("Error fetching multi-goal savings suggestion from Gemini API:", error);
    let errorMessage = "Sorry, I couldn't fetch a savings plan at this moment. Please try again later.";
     if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
            errorMessage = "Failed to get AI suggestions: The API key is not valid. Please check your configuration.";
        } else if (error instanceof SyntaxError || error.message.toLowerCase().includes("json")) {
            errorMessage = "Failed to parse AI response. The AI may not have returned valid JSON as requested. Please try again or check the AI's raw response if possible.";
        } else if (error.message.includes("expected JSON format") || error.message.includes("invalid items in goalBreakdown")) { 
             errorMessage = error.message; 
        }
    }
    throw new Error(errorMessage); // Re-throw as a new error to be caught by the component
  }
};

// Mock Chat implementation for when API_KEY is not set
const mockChat = {
  isMock: true, // Added property to identify mock chat
  sendMessageStream: async function* (params: { message: string }) {
    // Simulate initial thinking
    const thinkingMessagePart = { text: "Thinking..." };
    yield thinkingMessagePart; 

    await new Promise(resolve => setTimeout(resolve, 800)); 

    let responseText = "This is a mock response as the AI Chatbot is not configured. ";
    const userMessageLower = params.message.toLowerCase();

    if (userMessageLower.includes("hello") || userMessageLower.includes("hi")) {
        responseText += "Hello there! How can I assist you with your finances today (mock response)?";
    } else if (userMessageLower.includes("budget")) {
        responseText += "Creating a budget involves tracking income and expenses. Try to categorize your spending! (mock response)";
    } else if (userMessageLower.includes("invest")) {
        responseText += "When investing, consider your risk tolerance and investment horizon. Diversification is key! (mock response)";
    } else if (userMessageLower.includes("save money")) {
        responseText += "To save money, try setting clear goals, automating savings, and reducing non-essential spending. (mock response)";
    } else {
        responseText += `You asked about: "${params.message.substring(0, 30)}...". I would normally provide detailed financial advice here. (mock response)`;
    }
    
    const words = responseText.split(" ");
    let currentText = "";
    for (const word of words) {
        currentText += (currentText ? " " : "") + word;
         const messagePart = { text: currentText }; 
        yield messagePart;
        await new Promise(resolve => setTimeout(resolve, 50)); 
    }
  },
};


export const createRupIqChat = (): Chat | null => {
  if (!ai) { // ai is null if API_KEY is not set
    console.warn(MOCK_API_KEY_NOTICE + " RupIQ Chatbot will be mocked.");
    return mockChat as any; 
  }
  try {
    // Cast to include our custom `isMock` property for type safety if possible,
    // or manage it carefully if Chat type is sealed.
    const chat = ai.chats.create({
      model: GEMINI_TEXT_MODEL,
      config: {
        systemInstruction: 'You are RupIQ, a helpful, insightful, and professional personal finance advisor. Your goal is to provide clear, accurate, and actionable financial advice. Do not engage in off-topic conversations. If asked about non-financial topics, politely steer the conversation back to finance or state that you can only assist with financial matters.',
      },
    }) as Chat & { isMock?: boolean }; // Add type assertion for isMock

    // Assign the isMock property directly to the chat instance
    chat.isMock = false;
    return chat;

  } catch (error) {
    console.error("Error creating RupIQ Chat session:", error);
    // Fallback to mockChat if real chat creation fails but AI was initialized (e.g. temporary API issue)
    console.warn("Falling back to mocked chat due to error during real chat creation.");
    return mockChat as any; 
  }
};
