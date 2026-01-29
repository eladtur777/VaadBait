import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Account } from '../models';
import { AccountRepository } from '../database/repositories';

// App Context - Global state management (similar to Python's global variables but reactive)

interface AppContextType {
  // Current account
  currentAccount: Account | null;
  setCurrentAccount: (account: Account | null) => void;

  // All accounts
  accounts: Account[];
  loadAccounts: () => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Refresh trigger
  refreshKey: number;
  refresh: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load accounts from database
  const loadAccounts = () => {
    try {
      const allAccounts = AccountRepository.findAll();
      setAccounts(allAccounts);

      // Set default account if none selected
      if (!currentAccount && allAccounts.length > 0) {
        const defaultAccount = AccountRepository.getDefaultPersonalAccount() || allAccounts[0];
        setCurrentAccount(defaultAccount);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  // Refresh data
  const refresh = () => {
    setRefreshKey((prev) => prev + 1);
    loadAccounts();
  };

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, [refreshKey]);

  const value: AppContextType = {
    currentAccount,
    setCurrentAccount,
    accounts,
    loadAccounts,
    isLoading,
    setIsLoading,
    refreshKey,
    refresh,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hook to use app context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
