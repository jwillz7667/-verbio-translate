import { AnalyticsEvent } from '../types';

export class AnalyticsService {
  private static async getApiCredentials() {
    const { projectId, publicAnonKey } = await import('../utils/supabase/info');
    return { projectId, publicAnonKey };
  }

  static async trackEvent(event: string, data: any = {}, userId?: string): Promise<void> {
    try {
      const { projectId, publicAnonKey } = await this.getApiCredentials();
      
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-2a6414bb/analytics`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          data: {
            ...data,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            userId: userId || 'anonymous'
          }
        })
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  static async saveConversation(conversationData: any, userId?: string): Promise<void> {
    try {
      const { projectId, publicAnonKey } = await this.getApiCredentials();
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-2a6414bb/save-conversation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationData: {
            ...conversationData,
            userId: userId || 'anonymous',
            metadata: {
              userAgent: navigator.userAgent,
              language: navigator.language
            }
          },
          userId: userId || 'anonymous'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`);
      }

      const data = await response.json();
      console.log('Conversation saved successfully:', data);
      
    } catch (error) {
      console.error('Failed to save conversation:', error);
      throw error;
    }
  }
}