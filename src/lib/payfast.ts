// PayFast Configuration
export const PAYFAST_CONFIG = {
  merchantId: process.env.PAYFAST_MERCHANT_ID || '10042577', // Sandbox - WORKING CREDENTIALS
  merchantKey: process.env.PAYFAST_MERCHANT_KEY || 'lwzxkeczltrf1', // Sandbox - WORKING CREDENTIALS
  passphrase: process.env.PAYFAST_PASSPHRASE || 'TjayBurger2003', // Sandbox
  sandbox: process.env.NODE_ENV !== 'production',
  returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/payments/success`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/payments/cancel`,
  notifyUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payfast/webhook`,
  sandboxUrl: 'https://sandbox.payfast.co.za/eng/process',
  liveUrl: 'https://www.payfast.co.za/eng/process',
};

// Debug: Log what credentials are actually being used
console.log('🔑 PayFast Config Debug:');
console.log('🔑 Merchant ID:', PAYFAST_CONFIG.merchantId);
console.log('🔑 Merchant Key:', PAYFAST_CONFIG.merchantKey ? '[SET]' : '[NOT SET]');
console.log('🔑 Passphrase:', PAYFAST_CONFIG.passphrase ? '[SET]' : '[NOT SET]');
console.log('🔑 Environment PAYFAST_MERCHANT_ID:', process.env.PAYFAST_MERCHANT_ID);
console.log('🔑 Environment PAYFAST_PASSPHRASE:', process.env.PAYFAST_PASSPHRASE ? '[SET]' : '[NOT SET]');

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'business' | 'premium';

export const SUBSCRIPTION_PRICES = {
  starter: {
    amount: 0, // Free
    name: 'Starter Plan',
    description: 'Basic website creation with limited features',
  },
  pro: {
    amount: 10000, // R100.00 in cents
    name: 'Pro Subscription',
    description: 'Professional one-page websites with templates',
  },
  business: {
    amount: 25000, // R250.00 in cents
    name: 'Business Subscription',
    description: 'Advanced one-page websites with business tools',
  },
  premium: {
    amount: 50000, // R500.00 in cents
    name: 'Premium Subscription',
    description: 'Full multi-page websites with enterprise features',
  },
};

// Generate PayFast payment data (server-side only)
export function generatePayFastData(
  userId: string,
  tier: SubscriptionTier,
  customData?: Record<string, any>
) {
  // This function should only be called on the server side
  if (typeof window !== 'undefined') {
    throw new Error('PayFast data generation should only be done server-side');
  }

  // 'free' tier doesn't require payment
  if (tier === 'free') {
    throw new Error('Free tier does not require payment processing');
  }

  // Type narrow to exclude 'free' for accessing SUBSCRIPTION_PRICES
  type PaidTier = Exclude<SubscriptionTier, 'free'>;
  const subscription = SUBSCRIPTION_PRICES[tier as PaidTier];
  if (!subscription) {
    throw new Error(`Invalid subscription tier: ${tier}`);
  }

  // Generate unique payment reference
  const paymentId = `sub_${userId}_${tier}_${Date.now()}`;

  // EXACT field order from working PayFast URL
  const data = {
    return_url: PAYFAST_CONFIG.returnUrl,
    cancel_url: PAYFAST_CONFIG.cancelUrl,
    notify_url: PAYFAST_CONFIG.notifyUrl, // Include notify_url like working URL
    name_first: customData?.name_first || 'Customer',
    name_last: 'Name',
    email_address: customData?.email_address || 'customer@example.com',
    m_payment_id: paymentId,
    amount: (subscription.amount / 100).toFixed(2),
    item_name: subscription.name,
    item_description: subscription.description,
    custom_str1: userId,
    custom_str2: tier,
    merchant_id: PAYFAST_CONFIG.merchantId,
    merchant_key: PAYFAST_CONFIG.merchantKey,
  };

  // Run manual test for debugging
  testSignatureCalculation();

  // Generate signature
  const signature = generateSignature(data);
  console.log('🔐 FINAL SIGNATURE RESULT:', signature);

  return {
    ...data,
    signature,
    url: PAYFAST_CONFIG.sandbox ? PAYFAST_CONFIG.sandboxUrl : PAYFAST_CONFIG.liveUrl,
  };
}

// Test signature calculation manually - EXACT PayFast PHP replica
function testSignatureCalculation(): void {
  console.log('🧪 TESTING PAYFAST SIGNATURE CALCULATION');

  // EXACT field order from working PayFast URL
  const testData = {
    return_url: 'http://localhost:3000/dashboard/payments/success',
    cancel_url: 'http://localhost:3000/dashboard/payments/cancel',
    notify_url: 'http://localhost:3000/api/payfast/webhook',
    name_first: 'Customer',
    name_last: 'Name',
    email_address: 'customer@example.com',
    m_payment_id: 'jXiz0We2jtRCTpjOCUxnN8CZkVy2-gKDpYXONZk3R2BHOxDzF-1761748883359',
    amount: '100.00',
    item_name: 'Pro Plan',
    item_description: 'Pro plan for my SaaS',
    custom_str1: 'jXiz0We2jtRCTpjOCUxnN8CZkVy2',
    custom_str2: 'gKDpYXONZk3R2BHOxDzF',
    merchant_id: '10042577',
    merchant_key: 'lwzxkeczltrf1',
  };

  // EXACT replica of PHP code: foreach( $data as $key => $val )
  let pfOutput = '';
  (Object.keys(testData) as Array<keyof typeof testData>).forEach(key => {
    const val = testData[key];
    if (val !== '') {
      pfOutput += key + '=' + encodeURIComponent(val.toString().trim()) + '&';
    }
  });

  // Remove last ampersand
  let getString = pfOutput.slice(0, -1);

  // Add passphrase
  getString += '&passphrase=' + encodeURIComponent('TjayBurger2003');

  console.log('🧪 PHP-REPLICA TEST:');
  console.log('🧪 Raw pfOutput:', pfOutput);
  console.log('🧪 After removing &:', getString);

  const crypto = require('crypto');
  const signature = crypto.createHash('md5').update(getString, 'utf8').digest('hex');

  console.log('🧪 EXPECTED SIGNATURE:', signature);
  console.log('🧪 Full calculation string:', getString);
}

// Generate PayFast signature (server-side only)
function generateSignature(data: Record<string, any>): string {
  // This function should only be called on the server side
  if (typeof window !== 'undefined') {
    throw new Error('PayFast signature generation should only be done server-side');
  }

  // PayFast signature calculation - FOLLOW PHP EXAMPLE EXACTLY
  // Use field order as they appear in data object (insertion order)
  // Exclude signature and url fields as per PayFast docs
  const excludedFields = ['signature', 'url'];
  const orderedKeys = Object.keys(data)
    .filter(key => !excludedFields.includes(key));

  // Build signature string exactly as PayFast expects
  // PayFast typically excludes empty fields from signature calculation
  let signatureString = '';
  orderedKeys.forEach(key => {
    const value = data[key];
    const stringValue = value === null || value === undefined ? '' : value.toString().trim();

    // Only include non-empty fields in signature
    if (stringValue !== '') {
      signatureString += `${key}=${encodeURIComponent(stringValue)}&`;
    }
  });

  // Remove last &
  signatureString = signatureString.slice(0, -1);

  // Add passphrase (PayFast format: &passphrase=YOUR_PASSPHRASE)
  // PayFast passphrase SHOULD be URL encoded according to PHP example
  const cleanPassphrase = PAYFAST_CONFIG.passphrase.trim();
  signatureString += `&passphrase=${encodeURIComponent(cleanPassphrase)}`;

  console.log('🔐 ACTUAL SIGNATURE CALCULATION:');
  console.log('🔐 Ordered keys:', orderedKeys);
  console.log('🔐 Final signature string:', signatureString);

  // Generate MD5 hash
  try {
    // Try different crypto approaches
    let crypto;
    try {
      crypto = require('crypto');
    } catch (e) {
      // Fallback for different environments
      const { createHash } = require('crypto');
      crypto = { createHash };
    }

    const signature = crypto.createHash('md5').update(signatureString, 'utf8').digest('hex');
    console.log('🔐 Generated MD5 signature:', signature);

    // Also generate with different encoding to compare
    const signatureBinary = crypto.createHash('md5').update(signatureString, 'utf8').digest();
    console.log('🔐 Generated binary signature (hex):', signatureBinary.toString('hex'));

    return signature;
  } catch (error) {
    console.error('Crypto module error:', error);
    console.error('Signature string was:', signatureString);
    throw new Error('Failed to generate payment signature');
  }
}

// Verify PayFast signature (for webhooks)
export function verifySignature(data: Record<string, any>, receivedSignature: string): boolean {
  // Remove signature from data for verification
  const { signature, ...dataToVerify } = data;

  // Generate expected signature
  const expectedSignature = generateSignature(dataToVerify);

  return expectedSignature === receivedSignature;
}

// Parse PayFast webhook data
export function parsePayFastWebhook(formData: FormData) {
  const data: Record<string, any> = {};

  for (const [key, value] of formData.entries()) {
    data[key] = value.toString();
  }

  return data;
}

// Check if payment was successful
export function isPaymentSuccessful(paymentStatus: string): boolean {
  return paymentStatus === 'COMPLETE';
}

// Get subscription tier from payment
export function getTierFromPayment(customStr2: string): SubscriptionTier | null {
  const validTiers: SubscriptionTier[] = ['pro', 'business', 'premium'];
  return validTiers.includes(customStr2 as SubscriptionTier)
    ? (customStr2 as SubscriptionTier)
    : null;
}