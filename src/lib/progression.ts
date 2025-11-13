import { User, UserTier, Transaction } from '@/types';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface TierRequirements {
  starter: {
    maxServices: 5;
    maxTransactions: 0;
    features: string[];
  };
  professional: {
    minTransactions: 10;
    minRevenue: 2000;
    features: string[];
  };
  business: {
    minTransactions: 50;
    minRevenue: 10000;
    minAccountAge: 90; // days
    features: string[];
  };
}

export const tierRequirements: TierRequirements = {
  starter: {
    maxServices: 5,
    maxTransactions: 0,
    features: [
      'Basic templates',
      'PayFast integration',
      'Mobile optimization',
      'Contact forms',
      'Basic analytics'
    ]
  },
  professional: {
    minTransactions: 10,
    minRevenue: 2000,
    features: [
      'Advanced templates',
      'Custom domain',
      'Email integration',
      'Customer testimonials',
      'Enhanced analytics',
      'Social media integration'
    ]
  },
  business: {
    minTransactions: 50,
    minRevenue: 10000,
    minAccountAge: 90,
    features: [
      'Multi-page websites',
      'Booking system',
      'Customer management',
      'Advanced payments',
      'SEO optimization',
      'Marketing tools'
    ]
  }
};

export class ProgressionService {
  // Check if user qualifies for next tier
  async checkTierProgression(userId: string): Promise<{
    currentTier: UserTier;
    nextTier: UserTier | null;
    progress: number;
    requirements: string[];
    canUpgrade: boolean;
  }> {
    try {
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const user = { id: userId, ...userDoc.data() } as User;
      const currentTier = user.tier;

      // Get user's transactions
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        where('status', '==', 'completed')
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactions = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Transaction));

      const totalTransactions = transactions.length;
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
      const accountAge = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Determine next tier and requirements
      let nextTier: UserTier | null = null;
      let progress = 0;
      let requirements: string[] = [];
      let canUpgrade = false;

      switch (currentTier) {
        case 'starter':
          nextTier = 'professional';
          const profReq = tierRequirements.professional;
          const transactionProgress = Math.min((totalTransactions / profReq.minTransactions) * 100, 100);
          const revenueProgress = Math.min((totalRevenue / profReq.minRevenue) * 100, 100);
          progress = Math.max(transactionProgress, revenueProgress);
          
          requirements = [
            `${profReq.minTransactions} successful payments (${totalTransactions}/${profReq.minTransactions})`,
            `R${profReq.minRevenue} in revenue (R${totalRevenue.toFixed(2)}/R${profReq.minRevenue})`
          ];
          
          canUpgrade = totalTransactions >= profReq.minTransactions && totalRevenue >= profReq.minRevenue;
          break;

        case 'professional':
          nextTier = 'business';
          const busReq = tierRequirements.business;
          const busTransactionProgress = Math.min((totalTransactions / busReq.minTransactions) * 100, 100);
          const busRevenueProgress = Math.min((totalRevenue / busReq.minRevenue) * 100, 100);
          const ageProgress = Math.min((accountAge / busReq.minAccountAge) * 100, 100);
          progress = Math.min(busTransactionProgress, busRevenueProgress, ageProgress);
          
          requirements = [
            `${busReq.minTransactions} successful payments (${totalTransactions}/${busReq.minTransactions})`,
            `R${busReq.minRevenue} in revenue (R${totalRevenue.toFixed(2)}/R${busReq.minRevenue})`,
            `${busReq.minAccountAge} days active (${accountAge}/${busReq.minAccountAge})`
          ];
          
          canUpgrade = totalTransactions >= busReq.minTransactions && 
                      totalRevenue >= busReq.minRevenue && 
                      accountAge >= busReq.minAccountAge;
          break;

        case 'business':
          // User is at highest tier
          nextTier = null;
          progress = 100;
          requirements = ['You have unlocked all features!'];
          canUpgrade = false;
          break;
      }

      return {
        currentTier,
        nextTier,
        progress,
        requirements,
        canUpgrade
      };
    } catch (error) {
      console.error('Error checking tier progression:', error);
      throw error;
    }
  }

  // Upgrade user to next tier
  async upgradeUserTier(userId: string): Promise<boolean> {
    try {
      const progression = await this.checkTierProgression(userId);
      
      if (!progression.canUpgrade || !progression.nextTier) {
        return false;
      }

      // Update user tier
      await updateDoc(doc(db, 'users', userId), {
        tier: progression.nextTier,
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error upgrading user tier:', error);
      return false;
    }
  }

  // Get user's current tier features
  getTierFeatures(tier: UserTier): string[] {
    return tierRequirements[tier].features;
  }

  // Check if user can perform a specific action based on their tier
  canPerformAction(tier: UserTier, action: string): boolean {
    const features = this.getTierFeatures(tier);
    return features.includes(action);
  }

  // Get tier limits
  getTierLimits(tier: UserTier): { maxServices?: number; maxTransactions?: number } {
    const limits: { maxServices?: number; maxTransactions?: number } = {};
    
    if (tier === 'starter') {
      limits.maxServices = tierRequirements.starter.maxServices;
    }
    
    return limits;
  }
}

export const progressionService = new ProgressionService();
