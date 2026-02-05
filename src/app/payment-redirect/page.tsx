'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Client-side payment redirect handler
 * 
 * This page handles redirects from PayFast and uses browser APIs to redirect
 * back to the page the customer came from. This works even for old links
 * that don't have custom_str4 stored.
 * 
 * Flow:
 * 1. PayFast redirects here with payment status
 * 2. We check sessionStorage for stored referrer (set when link clicked)
 * 3. If not found, try document.referrer
 * 4. Fallback to API route for server-side lookup
 */
function PaymentRedirectContent() {
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState(true);
  const [status, setStatus] = useState<string>('Processing...');

  useEffect(() => {
    const handleRedirect = async () => {
      // Small delay to ensure localStorage is accessible
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        // Prevent infinite loops - check if we've already tried redirecting
        const redirectAttempted = sessionStorage.getItem('redirect_attempted');
        if (redirectAttempted === 'true') {
          console.log('⚠️ Redirect already attempted, preventing loop');
          sessionStorage.removeItem('redirect_attempted');
          localStorage.removeItem('payment_referrer');
          sessionStorage.removeItem('payment_referrer');
          setStatus('Redirecting to home page...');
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
          return;
        }

        // Get payment status from PayFast
        const paymentStatus = searchParams.get('payment_status') || 'UNKNOWN';
        const userId = searchParams.get('custom_str1');
        const serviceId = searchParams.get('custom_str2');
        const websiteId = searchParams.get('custom_str3');
        const customStr4Referrer = searchParams.get('custom_str4'); // From PayFast URL

        const localStorageData = localStorage.getItem('payment_referrer');
        const sessionStorageData = sessionStorage.getItem('payment_referrer');
        const previewDataBackupInitial = localStorage.getItem('preview_data');
        
        console.log('🔀 Payment redirect page loaded:', {
          paymentStatus,
          userId,
          serviceId,
          websiteId,
          customStr4Referrer,
          documentReferrer: document.referrer,
          localStorageReferrer: localStorageData,
          sessionStorageReferrer: sessionStorageData,
          localStoragePreviewData: previewDataBackupInitial,
          allLocalStorageKeys: Object.keys(localStorage).filter(k => k.includes('payment') || k.includes('preview'))
        });
        
        // Debug: Try to parse localStorage data
        if (localStorageData) {
          try {
            const parsed = JSON.parse(localStorageData);
            console.log('📦 Parsed localStorage data:', parsed);
            if (parsed.isPreview) {
              console.log('✅ Found preview data in localStorage!');
            }
          } catch (e) {
            console.log('📦 localStorage data is not JSON, treating as URL');
          }
        } else {
          console.warn('⚠️ No data in localStorage.getItem("payment_referrer")');
        }
        
        if (previewDataBackupInitial) {
          try {
            const parsed = JSON.parse(previewDataBackupInitial);
            console.log('📦 Parsed preview_data backup:', parsed);
          } catch (e) {
            console.warn('⚠️ Could not parse preview_data backup');
          }
        }

        // Priority 1: Use stored referrer from custom_str4 (new links)
        // Check if it's base64 encoded preview data OR a published URL
        if (customStr4Referrer) {
          try {
            // Try to decode as base64 JSON (preview/editor data)
            try {
              const previewDataStr = atob(customStr4Referrer);
              const previewData = JSON.parse(previewDataStr);
              if (previewData.isPreview && previewData.editorUrl) {
                // This is from preview/editor - redirect to editor with auto-preview
                console.log('✅ Found preview data in custom_str4, redirecting to editor with auto-preview:', previewData.editorUrl);
                setStatus('Redirecting back to preview...');
                const editorUrl = new URL(previewData.editorUrl);
                editorUrl.searchParams.set('openPreview', 'true');
                if (previewData.websiteId) {
                  editorUrl.searchParams.set('websiteId', previewData.websiteId);
                }
                window.location.href = editorUrl.toString();
                return;
              }
            } catch (e) {
              // Not base64, treat as regular URL (could be published site URL)
            }
            
            // Regular URL handling - check if it's a published site or editor/preview
            const referrerUrl = new URL(customStr4Referrer);
            const currentOrigin = window.location.origin;
            
            if (referrerUrl.origin === currentOrigin) {
              // Check if it's a published site URL (/p/) or editor/preview URL
              if (referrerUrl.pathname.startsWith('/p/')) {
                // Published site - redirect back to published site
                console.log('✅ Found published site referrer, redirecting to:', customStr4Referrer);
                setStatus('Redirecting back to website...');
                window.location.href = customStr4Referrer;
                return;
              } else {
                // Editor/preview - redirect back to that URL
                console.log('✅ Redirecting to custom_str4 referrer:', customStr4Referrer);
                setStatus('Redirecting back to your page...');
                window.location.href = customStr4Referrer;
                return;
              }
            }
          } catch (e) {
            console.warn('⚠️ Invalid custom_str4 referrer:', customStr4Referrer);
          }
        }

        // Priority 2: Check localStorage (shared across tabs - works for preview windows AND published sites!)
        // Re-read localStorage in case it was just set
        const localStorageReferrer = localStorage.getItem('payment_referrer') || localStorage.getItem('preview_data');
        console.log('🔍 Checking localStorage for referrer data:', {
          payment_referrer: localStorage.getItem('payment_referrer'),
          preview_data: localStorage.getItem('preview_data'),
          found: !!localStorageReferrer
        });
        
        if (localStorageReferrer) {
          try {
            // Check if it's preview/editor data (JSON)
            try {
              const previewData = JSON.parse(localStorageReferrer);
              console.log('📦 Parsed preview data:', previewData);
              if (previewData.isPreview && previewData.editorUrl) {
                // This is from preview/editor - redirect to editor with auto-preview
                console.log('✅ Found preview data in localStorage, redirecting to editor with auto-preview:', previewData.editorUrl);
                setStatus('Redirecting back to preview...');
                localStorage.removeItem('payment_referrer');
                localStorage.removeItem('preview_data');
                const editorUrl = new URL(previewData.editorUrl);
                editorUrl.searchParams.set('openPreview', 'true');
                if (previewData.websiteId) {
                  editorUrl.searchParams.set('websiteId', previewData.websiteId);
                }
                console.log('🚀 Redirecting to:', editorUrl.toString());
                window.location.href = editorUrl.toString();
                return;
              } else {
                console.warn('⚠️ Preview data missing required fields:', previewData);
              }
            } catch (e) {
              // Not JSON, treat as regular URL (could be published site URL)
            }
            
            // Regular URL handling - check if it's a published site or editor/preview
            const referrerUrl = new URL(localStorageReferrer);
            const currentOrigin = window.location.origin;
            
            // Don't redirect to payment-redirect pages (infinite loop prevention)
            if (referrerUrl.pathname.includes('/payment-redirect')) {
              console.log('⚠️ Ignoring payment-redirect referrer to prevent loop');
            } else if (referrerUrl.origin === currentOrigin) {
              // Check if it's a published site URL (/p/) or editor/preview URL
              if (referrerUrl.pathname.startsWith('/p/')) {
                // Published site - redirect back to published site
                console.log('✅ Found published site referrer in localStorage, redirecting to:', localStorageReferrer);
                setStatus('Redirecting back to website...');
                localStorage.removeItem('payment_referrer');
                localStorage.removeItem('preview_data');
                window.location.href = localStorageReferrer;
                return;
              } else {
                // Editor/preview - redirect back to that URL
                console.log('✅ Redirecting to localStorage referrer:', localStorageReferrer);
                setStatus('Redirecting back to your page...');
                localStorage.removeItem('payment_referrer');
                localStorage.removeItem('preview_data');
                window.location.href = localStorageReferrer;
                return;
              }
            }
          } catch (e) {
            console.warn('⚠️ Invalid localStorage referrer:', localStorageReferrer);
            localStorage.removeItem('payment_referrer');
            localStorage.removeItem('preview_data');
          }
        }

        // Also check sessionStorage as backup (for same-tab scenarios)
        const sessionReferrer = sessionStorage.getItem('payment_referrer');
        if (sessionReferrer) {
          try {
            const referrerUrl = new URL(sessionReferrer);
            const currentOrigin = window.location.origin;
            
            if (!referrerUrl.pathname.includes('/payment-redirect') && referrerUrl.origin === currentOrigin) {
              console.log('✅ Redirecting to sessionStorage referrer:', sessionReferrer);
              setStatus('Redirecting back to your page...');
              sessionStorage.removeItem('payment_referrer');
              window.location.href = sessionReferrer;
              return;
            }
          } catch (e) {
            console.warn('⚠️ Invalid sessionStorage referrer:', sessionReferrer);
            sessionStorage.removeItem('payment_referrer');
          }
        }

        // Priority 3: Try document.referrer (might be PayFast URL, but worth trying)
        const httpReferrer = document.referrer;
        if (httpReferrer && httpReferrer !== window.location.href) {
          try {
            const referrerUrl = new URL(httpReferrer);
            const currentOrigin = window.location.origin;
            
            // Don't redirect to payment-redirect pages (infinite loop prevention)
            if (referrerUrl.pathname.includes('/payment-redirect')) {
              console.log('⚠️ Ignoring payment-redirect referrer to prevent loop');
            } else if (referrerUrl.origin === currentOrigin && !httpReferrer.includes('payfast.co.za')) {
              console.log('✅ Redirecting to HTTP referrer:', httpReferrer);
              setStatus('Redirecting back to your page...');
              window.location.href = httpReferrer;
              return;
            }
          } catch (e) {
            console.warn('⚠️ Invalid HTTP referrer:', httpReferrer);
          }
        }

        // Priority 4: Check preview_data backup in localStorage (try again with delay)
        // Sometimes localStorage needs a moment to be accessible
        await new Promise(resolve => setTimeout(resolve, 200));
        const previewDataBackupRetry = localStorage.getItem('preview_data') || localStorage.getItem('payment_referrer');
        if (previewDataBackupRetry) {
          try {
            const previewData = JSON.parse(previewDataBackupRetry);
            console.log('📦 Found backup preview data:', previewData);
            if (previewData.isPreview && previewData.editorUrl) {
              console.log('✅ Found preview data in backup localStorage, redirecting to editor with auto-preview:', previewData.editorUrl);
              setStatus('Redirecting back to preview...');
              localStorage.removeItem('payment_referrer');
              localStorage.removeItem('preview_data');
              const editorUrl = new URL(previewData.editorUrl);
              editorUrl.searchParams.set('openPreview', 'true');
              // Ensure websiteId is in URL if available
              if (previewData.websiteId) {
                editorUrl.searchParams.set('websiteId', previewData.websiteId);
              }
              console.log('🚀 Redirecting to:', editorUrl.toString());
              window.location.href = editorUrl.toString();
              return;
            }
          } catch (e) {
            console.warn('⚠️ Could not parse preview_data backup:', e, previewDataBackupRetry);
          }
        }

        // Priority 5: NEVER fallback to API route - it causes infinite loops!
        // Instead, check localStorage one more time with a longer delay
        console.log('⚠️ No referrer found in initial checks, waiting and retrying localStorage...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Final localStorage check with delay
        const finalLocalStorageCheck = localStorage.getItem('payment_referrer') || localStorage.getItem('preview_data');
        if (finalLocalStorageCheck) {
          try {
            const previewData = JSON.parse(finalLocalStorageCheck);
            if (previewData.isPreview && previewData.editorUrl) {
              console.log('✅ Found preview data in final localStorage check!', previewData.editorUrl);
              setStatus('Redirecting back to preview...');
              localStorage.removeItem('payment_referrer');
              localStorage.removeItem('preview_data');
              const editorUrl = new URL(previewData.editorUrl);
              editorUrl.searchParams.set('openPreview', 'true');
              if (previewData.websiteId) {
                editorUrl.searchParams.set('websiteId', previewData.websiteId);
              }
              console.log('🚀 Final redirect to:', editorUrl.toString());
              window.location.href = editorUrl.toString();
              return;
            }
          } catch (e) {
            console.warn('⚠️ Could not parse final localStorage check:', e);
          }
        }
        
        // List all localStorage keys for debugging
        const allKeys = Object.keys(localStorage);
        console.log('📋 All localStorage keys:', allKeys);
        const previewKeys = allKeys.filter(k => k.includes('preview') || k.includes('payment'));
        console.log('📋 Preview-related keys:', previewKeys);
        previewKeys.forEach(key => {
          console.log(`📋 ${key}:`, localStorage.getItem(key));
        });
        
        // Final fallback: redirect to dashboard (NOT API route - prevents infinite loop)
        console.log('⚠️ No preview data found in localStorage after all checks.');
        console.log('⚠️ This happens when using old payment links or if localStorage was cleared.');
        console.log('⚠️ Redirecting to dashboard instead of API route to prevent infinite loop.');
        setStatus('Payment successful! Redirecting to dashboard...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
        
      } catch (error) {
        console.error('❌ Error in payment redirect:', error);
        setStatus('Redirecting to home page...');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    };

    handleRedirect();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}

export default function PaymentRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>}>
      <PaymentRedirectContent />
    </Suspense>
  );
}