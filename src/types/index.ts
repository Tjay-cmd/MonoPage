export interface User {
  id: string;
  email: string;
  businessName: string;
  businessType: BusinessType;
  tier: UserTier;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  userId: string;
  name: string;
  description: string;
  price: number;
  duration?: number; // in minutes
  category: string;
  isActive: boolean;
  payfastLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  businessType: BusinessType;
  tier: UserTier;
  previewImage: string;
  templateData: TemplateData;
  isActive: boolean;
}

export interface TemplateData {
  sections: TemplateSection[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

export interface TemplateSection {
  id: string;
  type: 'hero' | 'services' | 'about' | 'contact' | 'testimonials' | 'gallery';
  content: any;
  order: number;
}

export interface Website {
  id: string;
  userId: string;
  templateId: string;
  customizations: WebsiteCustomizations;
  domain?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebsiteCustomizations {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  logo?: string;
  backgroundImage?: string;
  businessInfo: {
    name: string;
    description: string;
    phone: string;
    email: string;
    address: string;
  };
}

export interface Transaction {
  id: string;
  userId: string;
  serviceId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payfastTransactionId?: string;
  customerEmail: string;
  customerName: string;
  createdAt: Date;
  completedAt?: Date;
}

export type BusinessType = 
  | 'barber' 
  | 'photographer' 
  | 'tutor' 
  | 'beauty-salon' 
  | 'fitness-trainer' 
  | 'consultant' 
  | 'other';

export type UserTier = 'free' | 'starter' | 'pro' | 'business' | 'premium' | 'admin';

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
