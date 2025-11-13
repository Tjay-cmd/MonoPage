export type SubscriptionTier =
  | 'free'
  | 'starter'
  | 'pro'
  | 'business'
  | 'premium'
  | 'admin';

const tierHierarchy: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
  premium: 4,
  admin: 5,
};

const featurePermissions: Record<string, SubscriptionTier[]> = {
  // Admin-only features
  adminPanel: ['admin'],
  templateManagement: ['admin'],
  userManagement: ['admin'],
  systemSettings: ['admin'],

  // Website creation features
  multiPageWebsites: ['premium', 'admin'],
  templates: ['pro', 'business', 'premium', 'admin'],
  customDomain: ['pro', 'business', 'premium', 'admin'],
  removeBranding: ['pro', 'business', 'premium', 'admin'],

  // Payment features
  payfast: ['pro', 'business', 'premium', 'admin'],
  advancedPayfast: ['business', 'premium', 'admin'],
  eCommerce: ['premium', 'admin'],

  // Business features
  bookings: ['business', 'premium', 'admin'],
  customerManagement: ['business', 'premium', 'admin'],
  emailMarketing: ['business', 'premium', 'admin'],

  // Advanced features
  teamCollaboration: ['premium', 'admin'],
  apiAccess: ['premium', 'admin'],
  whiteLabel: ['premium', 'admin'],

  // Analytics
  advancedAnalytics: ['pro', 'business', 'premium', 'admin'],
  conversionTracking: ['business', 'premium', 'admin'],
};

export function normalizeTier(tier: string | null | undefined): SubscriptionTier {
  const safe = (tier ?? 'free').toLowerCase().trim();
  if (safe in tierHierarchy) {
    return safe as SubscriptionTier;
  }
  return 'free';
}

export function hasTierAccess(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  return tierHierarchy[userTier] >= tierHierarchy[requiredTier];
}

export function canAccessFeature(userTier: SubscriptionTier, feature: string): boolean {
  const allowedTiers = featurePermissions[feature];
  if (!allowedTiers) {
    return false;
  }
  return allowedTiers.includes(userTier);
}

export function isAdminTier(tier: string | null | undefined): boolean {
  return normalizeTier(tier) === 'admin';
}

