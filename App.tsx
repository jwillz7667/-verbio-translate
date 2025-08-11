import React, { useCallback } from 'react';
import { AnimatedBackground } from './components/AnimatedBackground';
import { SignIn } from './components/SignIn';
import { SignUp } from './components/SignUp';
import { AccountSettings } from './components/AccountSettings';
import { MainPage } from './components/pages/MainPage';
import { AppProvider, useAppContext } from './context/AppContext';
import { useAnalytics } from './hooks/useAnalytics';
import { User } from './types';

function AppContent() {
  const { state, dispatch } = useAppContext();
  const { currentPage, user, isListening, isProcessing } = state;
  const { trackAnalytics } = useAnalytics(user?.id);

  // Authentication handlers
  const handleSignIn = useCallback((userData: User) => {
    dispatch({ type: 'SET_USER', payload: userData });
    dispatch({ type: 'SET_CURRENT_PAGE', payload: 'main' });
    trackAnalytics('user_signin', { userId: userData.id });
  }, [dispatch, trackAnalytics]);

  const handleSignUp = useCallback((userData: User) => {
    dispatch({ type: 'SET_USER', payload: userData });
    dispatch({ type: 'SET_CURRENT_PAGE', payload: 'main' });
    trackAnalytics('user_signup', { userId: userData.id });
  }, [dispatch, trackAnalytics]);

  const handleSignOut = useCallback(() => {
    if (user) {
      trackAnalytics('user_signout', { userId: user.id });
    }
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_CURRENT_PAGE', payload: 'signin' });
    dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: null });
    dispatch({ type: 'SET_IS_PROCESSING', payload: false });
  }, [user, dispatch, trackAnalytics]);

  const handlePageChange = useCallback((page: 'signin' | 'settings') => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
  }, [dispatch]);

  // Render different pages
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'signin':
        return (
          <SignIn 
            onSignIn={handleSignIn}
            onSwitchToSignUp={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: 'signup' })}
            onBack={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: 'main' })}
          />
        );
      case 'signup':
        return (
          <SignUp 
            onSignUp={handleSignUp}
            onSwitchToSignIn={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: 'signin' })}
            onBack={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: 'main' })}
          />
        );
      case 'settings':
        return (
          <AccountSettings 
            user={user}
            onUpdateUser={(updatedUser) => dispatch({ type: 'SET_USER', payload: updatedUser })}
            onSignOut={handleSignOut}
            onBack={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: 'main' })}
          />
        );
      default:
        return <MainPage onPageChange={handlePageChange} />;
    }
  };

  const getBackgroundVariant = () => {
    if (currentPage === 'main') return 'main';
    if (currentPage === 'settings') return 'settings';
    return 'auth';
  };

  return (
    <AnimatedBackground 
      isListening={isListening || isProcessing} 
      variant={getBackgroundVariant()}
    >
      {renderCurrentPage()}
    </AnimatedBackground>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}