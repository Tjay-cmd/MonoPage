// PayFast Simple Integration
// Using PayFast's Simple Integration method - much easier and more reliable!

export interface PayFastConfig {
  merchantId: string;
  merchantKey: string;
  passPhrase: string;
  environment: 'sandbox' | 'production';
}

export interface PayFastPaymentData {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  name_first: string;
  name_last: string;
  email_address: string;
  m_payment_id: string;
  amount: string;
  item_name: string;
  item_description: string;
  custom_str1?: string;
  custom_str2?: string;
}

class PayFastService {
  private config: PayFastConfig;

  constructor(config: PayFastConfig) {
    this.config = config;
  }

  // Generate PayFast payment URL using Simple Integration
  generatePaymentUrl(paymentData: Omit<PayFastPaymentData, 'merchant_id' | 'merchant_key'>): string {
    const baseUrl = this.config.environment === 'sandbox'
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    // Simple integration - no signature required!
    const fullPaymentData: PayFastPaymentData = {
      ...paymentData,
      merchant_id: this.config.merchantId,
      merchant_key: this.config.merchantKey,
    };

    // Build query string with proper encoding
    const queryParams: string[] = [];
    Object.entries(fullPaymentData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.push(`${key}=${encodeURIComponent(value.toString().trim())}`);
      }
    });

    const finalUrl = `${baseUrl}?${queryParams.join('&')}`;
    
    // Debug logging
    console.log('PayFast Simple Integration URL Generated:', finalUrl);
    console.log('Query parameters:', queryParams);
    
    return finalUrl;
  }
}

// Default PayFast configuration
export const defaultPayFastConfig: PayFastConfig = {
  merchantId: process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_ID || '10042577',
  merchantKey: process.env.NEXT_PUBLIC_PAYFAST_MERCHANT_KEY || 'lwzxkeczltrf1',
  passPhrase: process.env.PAYFAST_PASSPHRASE || 'Tjayburger2004',
  environment: (process.env.NEXT_PUBLIC_PAYFAST_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
};

export const payFastService = new PayFastService(defaultPayFastConfig);

// Utility function to create payment data for a service
export function createPaymentDataForService(
  service: {
    id: string;
    name: string;
    description: string;
    price: number;
  },
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  },
  userId: string
): Omit<PayFastPaymentData, 'merchant_id' | 'merchant_key'> {
  // Ensure amount is formatted as decimal with 2 decimal places
  const formattedAmount = service.price.toFixed(2);
  
  return {
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/payments/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/payments/cancel`,
    notify_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payfast/notify`,
    name_first: customer.firstName.trim(),
    name_last: customer.lastName.trim(),
    email_address: customer.email.trim(),
    m_payment_id: `${userId}-${service.id}-${Date.now()}`,
    amount: formattedAmount,
    item_name: service.name.trim(),
    item_description: service.description.trim(),
    custom_str1: userId,
    custom_str2: service.id,
  };
}

// Generate a real PayFast payment link using Simple Integration
export function generatePayFastPaymentLink(service: Service, userId: string, merchantSettings?: MerchantSettings): string {
  const customer = {
    firstName: 'Customer', // This will be filled by the customer on the payment page
    lastName: 'Name',
    email: 'customer@example.com'
  };

  const paymentData = createPaymentDataForService(service, customer, userId);
  
  // Use user-specific merchant settings if provided, otherwise use default
  if (merchantSettings) {
    const userPayFastService = new PayFastService({
      merchantId: merchantSettings.merchantId,
      merchantKey: merchantSettings.merchantKey,
      passPhrase: merchantSettings.passPhrase,
      environment: merchantSettings.environment
    });
    return userPayFastService.generatePaymentUrl(paymentData);
  }
  
  return payFastService.generatePaymentUrl(paymentData);
}

// Interface for merchant settings
export interface MerchantSettings {
  merchantId: string;
  merchantKey: string;
  passPhrase: string;
  environment: 'sandbox' | 'production';
}

// Import Service type
import { Service } from '@/types';
