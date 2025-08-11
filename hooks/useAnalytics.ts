import { useCallback } from 'react';
import { AnalyticsService } from '../services/analyticsService';

export function useAnalytics(userId?: string) {
  const trackAnalytics = useCallback(async (event: string, data: any = {}) => {
    await AnalyticsService.trackEvent(event, data, userId);
  }, [userId]);

  const saveConversation = useCallback(async (conversationData: any) => {
    await AnalyticsService.saveConversation(conversationData, userId);
  }, [userId]);

  return {
    trackAnalytics,
    saveConversation
  };
}