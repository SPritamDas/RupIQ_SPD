import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import IncomeTracker from './components/IncomeTracker';
import ExpenseTracker from './components/ExpenseTracker';
import InvestmentTracker from './components/InvestmentTracker';
import GoalBudgeting from './components/GoalBudgeting';
import SplitterLedger from './components/SplitterLedger';
import CalculatorsPage from './components/CalculatorsPage';
import TodoTasks from './components/TodoTasks';
import AISuggestions from './components/AISuggestions';
import { DEFAULT_CURRENCY } from './constants'; // Ensure this is imported if used by children

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<string>(() => {
    const hash = window.location.hash.replace('#/', '');
    return hash || 'dashboard';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      setActivePage(hash || 'dashboard');
    };
    window.addEventListener('hashchange', handleHashChange);
    // Set initial page based on hash
    handleHashChange();
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    // Update hash when activePage changes programmatically
    if (window.location.hash.replace('#/', '') !== activePage) {
        window.location.hash = `/${activePage}`;
    }
  }, [activePage]);


  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard setActivePage={setActivePage} />;
      case 'income':
        return <IncomeTracker />;
      case 'expenses':
        return <ExpenseTracker />;
      case 'investments':
        return <InvestmentTracker />;
      case 'goals':
        return <GoalBudgeting />;
      case 'splitter':
        return <SplitterLedger />;
      case 'calculators':
        return <CalculatorsPage />;
      case 'todo':
        return <TodoTasks />;
      case 'ai-insights':
        return <AISuggestions />;
      default:
        return <Dashboard setActivePage={setActivePage} />;
    }
  };

  return (
    <Layout activePage={activePage} setActivePage={setActivePage}>
      {renderPage()}
    </Layout>
  );
};

export default App;