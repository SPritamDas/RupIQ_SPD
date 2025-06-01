import React, { useState, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { IncomeItem, ExpenseItem, InvestmentItem, FinancialGoal, UserDebts, SplitEvent, TodoTask } from '../types';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Input, Textarea } from './common/Input';
import { Modal } from './common/Modal';
import { SparklesIcon, TrashIcon, PlusCircleIcon, ExclamationTriangleIcon } from './icons/IconComponents';
import { getFinancialSuggestions } from '../services/geminiService';
import { formatCurrency } from '../services/financeService';
import { DEFAULT_CURRENCY, CHART_COLORS } from '../constants';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import RupIqChatbot from './common/RupIqChatbot';
import { DisclaimerCard } from './common/DisclaimerCard'; // Added import

interface CustomAssetPreference {
  id: string;
  name: string;
  expGrowthStr: string;
  riskStr: string;
}

interface PortfolioCalculationResultItem {
  id: string;
  name: string;
  expGrowth: number;
  risk: number;
  rawScore: number;
  normalizedScore: number; // as a percentage (0-100)
  allocatedAmount: number;
}


const AISuggestions: React.FC = () => {
  const [incomes] = useLocalStorage<IncomeItem[]>('incomes', []);
  const [expenses] = useLocalStorage<ExpenseItem[]>('expenses', []);
  const [investments] = useLocalStorage<InvestmentItem[]>('investments', []);
  const [goals] = useLocalStorage<FinancialGoal[]>('financialGoals', []);
  const [userDebts] = useLocalStorage<UserDebts>('userDebts', { totalDebt: 0 });
  const [splitEvents] = useLocalStorage<SplitEvent[]>('splitEvents', []);
  const [todoTasks] = useLocalStorage<TodoTask[]>('todoTasks', []);


  // State for General Financial Health Check
  const [generalSuggestions, setGeneralSuggestions] = useState<string>('');
  const [isLoadingGeneral, setIsLoadingGeneral] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [analysisPart, setAnalysisPart] = useState<string>('');
  const [questionsPart, setQuestionsPart] = useState<string>('');

  // State for Custom Portfolio Calculator
  const [customTotalInvestment, setCustomTotalInvestment] = useState<string>('');
  const [customAssets, setCustomAssets] = useState<CustomAssetPreference[]>([
    { id: Date.now().toString(), name: '', expGrowthStr: '', riskStr: '' }
  ]);
  const [customFormula, setCustomFormula] = useState<string>('g/r'); // Default example
  const [calculationResults, setCalculationResults] = useState<PortfolioCalculationResultItem[] | null>(null);
  const [calculatorError, setCalculatorError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);


  // State for Chatbot Modal
  const [isChatbotModalOpen, setIsChatbotModalOpen] = useState(false);


  const fetchGeneralSuggestions = useCallback(async () => {
    setIsLoadingGeneral(true);
    setGeneralError(null);
    setGeneralSuggestions('');
    setAnalysisPart('');
    setQuestionsPart('');
    try {
      const result = await getFinancialSuggestions(incomes, expenses, investments, goals, userDebts, splitEvents, todoTasks);
      setGeneralSuggestions(result);

      const delimiter = "---Key Questions for Deeper Insight:---";
      const parts = result.split(delimiter);
      setAnalysisPart(parts[0].trim());
      if (parts.length > 1) {
        setQuestionsPart(parts[1].trim());
      }

    } catch (err) {
      console.error("AI General Suggestion Error:", err);
      setGeneralError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoadingGeneral(false);
    }
  }, [incomes, expenses, investments, goals, userDebts, splitEvents, todoTasks]);


  const renderFormattedText = (text: string) => {
    return text.split('\n').map((paragraph, index) => {
      paragraph = paragraph.trim();
      if (!paragraph) return null;
      
      if (paragraph.startsWith('- ') || paragraph.startsWith('* ') || /^\d+\.\s/.test(paragraph)) {
        return <li key={index} className="mb-1 ml-4 text-content-secondary">{paragraph.substring(paragraph.indexOf(' ')+1)}</li>;
      }
      return <p key={index} className="mb-2 text-content-secondary leading-relaxed">{paragraph}</p>;
    });
  };

  // Custom Portfolio Calculator Functions
  const handleAddCustomAsset = () => {
    setCustomAssets([
      ...customAssets,
      { id: Date.now().toString(), name: '', expGrowthStr: '', riskStr: '' }
    ]);
  };

  const handleRemoveCustomAsset = (id: string) => {
    setCustomAssets(customAssets.filter(asset => asset.id !== id));
  };

  const handleCustomAssetChange = (id: string, field: keyof Omit<CustomAssetPreference, 'id'>, value: string) => {
    setCustomAssets(customAssets.map(asset =>
      asset.id === id ? { ...asset, [field]: value } : asset
    ));
  };

  const handleCalculatePortfolio = () => {
    setIsCalculating(true);
    setCalculatorError(null);
    setCalculationResults(null);

    const totalInvestmentNum = parseFloat(customTotalInvestment);
    if (isNaN(totalInvestmentNum) || totalInvestmentNum <= 0) {
      setCalculatorError('Please enter a valid positive Total Investment Amount.');
      setIsCalculating(false);
      return;
    }

    if (customAssets.length === 0) {
      setCalculatorError('Please add at least one asset.');
      setIsCalculating(false);
      return;
    }

    if (!customFormula.trim()) {
      setCalculatorError('Please enter a custom formula.');
      setIsCalculating(false);
      return;
    }

    const evaluatedAssets: Array<PortfolioCalculationResultItem & { validScore: boolean }> = [];
    let sumOfPositiveScores = 0;

    for (const asset of customAssets) {
      const g = parseFloat(asset.expGrowthStr);
      const r = parseFloat(asset.riskStr);

      if (!asset.name.trim()) {
        setCalculatorError(`Asset name is missing for one of the entries.`);
        setIsCalculating(false);
        return;
      }
      if (isNaN(g)) {
        setCalculatorError(`Invalid Expected Growth for asset "${asset.name}". Please enter a number.`);
        setIsCalculating(false);
        return;
      }
      if (isNaN(r)) {
        setCalculatorError(`Invalid Risk Number for asset "${asset.name}". Please enter a number.`);
        setIsCalculating(false);
        return;
      }
      
      let rawScore = 0;
      let validScore = false;
      try {
        // IMPORTANT: Using new Function is a security risk if the formulaString is not controlled or sanitized.
        // Here, we assume the user (developer/trusted user) provides a simple math expression.
        // For a public app, a proper math expression parser/evaluator is needed.
        const calculateScore = new Function('g', 'r', `return ${customFormula}`);
        const scoreResult = calculateScore(g, r);
        if (typeof scoreResult !== 'number' || isNaN(scoreResult) || !isFinite(scoreResult)) {
          rawScore = 0; // Treat non-numeric/Infinity results as 0
        } else {
          rawScore = scoreResult;
        }
        validScore = true; // Mark as valid even if score is 0 or negative to show in table
      } catch (e) {
        console.error(`Error evaluating formula for asset ${asset.name}:`, e);
        setCalculatorError(`Error in formula for asset "${asset.name}": ${(e as Error).message}. Score set to 0.`);
        rawScore = 0; 
        // Do not return; continue processing other assets but this asset gets score 0
      }

      const nonNegativeScore = Math.max(0, rawScore); // Treat negative scores as 0 for allocation sum
      
      evaluatedAssets.push({
        id: asset.id,
        name: asset.name,
        expGrowth: g,
        risk: r,
        rawScore: rawScore, // Store original raw score for display
        normalizedScore: 0, // Will calculate later
        allocatedAmount: 0, // Will calculate later
        validScore: validScore,
      });
      
      if (nonNegativeScore > 0) {
        sumOfPositiveScores += nonNegativeScore;
      }
    }

    if (sumOfPositiveScores <= 0) {
      // Handle case where all scores are zero or negative, or sum is zero.
      // Display raw scores but allocate 0.
      const finalResults = evaluatedAssets.map(asset => ({
        ...asset,
        normalizedScore: 0,
        allocatedAmount: 0,
      }));
      setCalculationResults(finalResults);
      if (evaluatedAssets.every(a => a.rawScore <= 0)) {
        setCalculatorError('All calculated asset scores are zero or negative. Cannot allocate funds based on the formula.');
      } else if (sumOfPositiveScores === 0 && evaluatedAssets.some(a => a.rawScore > 0)){
         // This case should ideally not happen if sumOfPositiveScores is calculated correctly from nonNegativeScore
         setCalculatorError('Sum of positive scores is zero, cannot normalize allocations.');
      }
      setIsCalculating(false);
      return;
    }

    const finalResults = evaluatedAssets.map(asset => {
      const nonNegativeScore = Math.max(0, asset.rawScore);
      const normalized = nonNegativeScore > 0 ? (nonNegativeScore / sumOfPositiveScores) * 100 : 0;
      return {
        id: asset.id,
        name: asset.name,
        expGrowth: asset.expGrowth,
        risk: asset.risk,
        rawScore: asset.rawScore,
        normalizedScore: parseFloat(normalized.toFixed(2)),
        allocatedAmount: parseFloat(((normalized / 100) * totalInvestmentNum).toFixed(2)),
      };
    });

    setCalculationResults(finalResults);
    setIsCalculating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
         <SparklesIcon className="w-8 h-8 text-primary" />
         <h1 className="text-3xl font-bold text-content">RupIQ AI Tools</h1>
      </div>
      <DisclaimerCard />

      {/* Section 0: RupIQ AI Chatbot */}
      <Card title="RupIQ AI Chatbot">
        <div className="space-y-4">
          <p className="text-content-secondary">
            Have a financial question? Ask RupIQ! Your AI-powered financial assistant is here to help with general queries, understanding concepts, or getting quick advice.
          </p>
          <Button onClick={() => setIsChatbotModalOpen(true)} leftIcon={<SparklesIcon />} variant="secondary">
            Open RupIQ Chatbot
          </Button>
        </div>
      </Card>

      {/* Section 1: General Financial Health Check */}
      <Card title="General Financial Health Check">
        <div className="space-y-4">
          <p className="text-content-secondary">
            Get personalized financial suggestions based on your overall financial picture. The AI will also pose some questions to help you think deeper.
          </p>
          <Button onClick={fetchGeneralSuggestions} isLoading={isLoadingGeneral} disabled={isLoadingGeneral} leftIcon={<SparklesIcon />}>
            {isLoadingGeneral ? 'Analyzing Your Finances...' : (generalSuggestions ? 'Refresh Health Check' : 'Run Health Check')}
          </Button>

          {generalError && (
            <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
              <p className="font-semibold">Error:</p><p>{generalError}</p>
            </div>
          )}

          {analysisPart && !isLoadingGeneral && (
            <Card title="Your Financial Health Analysis" className="mt-6 bg-base-100 shadow-md">
                <div className="whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none text-content">
                   {renderFormattedText(analysisPart)}
                </div>
            </Card>
          )}
          
          {questionsPart && !isLoadingGeneral && (
             <Card title="Questions from Your AI Analyst" className="mt-6 bg-sky-50 border border-sky-200 shadow-md">
                <p className="text-sm text-sky-700 mb-3">Consider these questions for a deeper reflection on your finances. Answering them (even to yourself) can help you gain more clarity for future planning.</p>
                <ul className="list-decimal list-inside space-y-2 text-sky-800">
                    {questionsPart.split('\n').map((q, i) => {
                        const questionText = q.replace(/^\d+\.\s*/, '').trim();
                        return questionText ? <li key={i}>{questionText}</li> : null;
                    })}
                </ul>
            </Card>
          )}


           {!generalSuggestions && !isLoadingGeneral && !generalError && (
             <p className="text-content-secondary text-center py-5">Click the button to generate your financial health check and AI insights.</p>
           )}
        </div>
      </Card>

      {/* Section 2: Custom Portfolio Calculator */}
      <Card title="Custom Portfolio Calculator">
        <div className="space-y-6">
          <p className="text-content-secondary">
            Input your total investment, asset details (expected growth 'g', risk 'r'), and a custom formula to calculate scores and allocate funds.
          </p>

          <Input
            label={`Total Investment Amount (${DEFAULT_CURRENCY})`}
            type="number"
            value={customTotalInvestment}
            onChange={(e) => setCustomTotalInvestment(e.target.value)}
            placeholder="e.g., 100000"
            min="1"
          />

          <div className="space-y-4">
            <h4 className="text-md font-semibold text-content">Asset Details:</h4>
            {customAssets.map((asset, index) => (
              <Card key={asset.id} className="bg-base-100 p-4 border border-base-300">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <Input
                    containerClassName="mb-0 md:col-span-2"
                    label={`Asset ${index + 1} Name`}
                    value={asset.name}
                    onChange={(e) => handleCustomAssetChange(asset.id, 'name', e.target.value)}
                    placeholder="e.g., Indian Large Cap Equity"
                  />
                  <Input
                    containerClassName="mb-0"
                    label="Exp. Growth (g)"
                    type="number"
                    value={asset.expGrowthStr}
                    onChange={(e) => handleCustomAssetChange(asset.id, 'expGrowthStr', e.target.value)}
                    placeholder="e.g., 12 for 12%"
                  />
                  <Input
                    containerClassName="mb-0"
                    label="Risk (r)"
                    type="number"
                    value={asset.riskStr}
                    onChange={(e) => handleCustomAssetChange(asset.id, 'riskStr', e.target.value)}
                    placeholder="e.g., 7"
                  />
                </div>
                {customAssets.length > 1 && (
                    <div className="flex justify-end mt-2">
                        <Button variant="danger" size="sm" onClick={() => handleRemoveCustomAsset(asset.id)} leftIcon={<TrashIcon className="w-4 h-4" />}>
                            Remove Asset
                        </Button>
                    </div>
                )}
              </Card>
            ))}
            <Button variant="outline" onClick={handleAddCustomAsset} leftIcon={<PlusCircleIcon />}>
              Add Another Asset
            </Button>
          </div>
          
          <Input
            label="Custom Score Formula (use 'g' for growth, 'r' for risk)"
            value={customFormula}
            onChange={(e) => setCustomFormula(e.target.value)}
            placeholder="e.g., g/r or g - r*2 or g * (10-r)"
          />
          <div className="p-2 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-700 flex items-start">
            <ExclamationTriangleIcon className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Warning:</strong> The formula is evaluated directly. Use only numbers, `g`, `r`, and basic operators (`+`, `-`, `*`, `/`, `(` `)`). Invalid formulas or operations (like division by zero) may cause errors or unexpected scores (treated as 0).
            </span>
          </div>


          <Button onClick={handleCalculatePortfolio} isLoading={isCalculating} disabled={isCalculating} leftIcon={<SparklesIcon />} className="w-full md:w-auto">
            {isCalculating ? 'Calculating...' : 'Calculate Allocation'}
          </Button>

          {calculatorError && (
            <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
              <p className="font-semibold">Error:</p><p>{calculatorError}</p>
            </div>
          )}

          {calculationResults && !isCalculating && (
            <Card title="Portfolio Allocation Results" className="mt-6 bg-primary/5 border border-primary/20">
              <div className="mb-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-base-300">
                  <thead className="bg-base-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Asset Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Exp. Growth (g)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Risk (r)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Raw Score</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Normalized (%)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-content-secondary uppercase tracking-wider">Allocated Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-base-100 divide-y divide-base-300">
                    {calculationResults.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-content font-medium">{item.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-content">{item.expGrowth}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-content">{item.risk}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-content">{item.rawScore.toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-content font-semibold">{item.normalizedScore.toFixed(2)}%</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-secondary font-bold">{formatCurrency(item.allocatedAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {calculationResults.filter(item => item.allocatedAmount > 0).length > 0 && (
                <div className="h-80 md:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={calculationResults.filter(item => item.allocatedAmount > 0)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="allocatedAmount"
                                nameKey="name"
                            >
                                {calculationResults.filter(item => item.allocatedAmount > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number, name: string, props) => [formatCurrency(value), props.payload.name]} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
              )}
            </Card>
          )}
        </div>
      </Card>

      <Modal isOpen={isChatbotModalOpen} onClose={() => setIsChatbotModalOpen(false)} title="RupIQ AI Chatbot" size="lg">
        <RupIqChatbot />
      </Modal>

    </div>
  );
};

export default AISuggestions;