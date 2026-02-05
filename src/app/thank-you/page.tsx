'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function ThankYouPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState<string>('/');
  const [countdown, setCountdown] = useState<number>(3);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const redirect = url.searchParams.get('redirect');
      console.log('🔍 Thank-you page loaded, redirect param:', redirect);
      if (redirect && redirect.startsWith('/')) {
        setReturnTo(redirect);
        console.log('✅ Set returnTo to:', redirect);
        return;
      }

      // Fallback: same-origin referrer
      const ref = document.referrer || '';
      const sameOrigin = ref && new URL(ref).origin === window.location.origin;
      if (sameOrigin) {
        const refPath = new URL(ref).pathname || '/';
        setReturnTo(refPath);
        console.log('✅ Using referrer as fallback:', refPath);
        return;
      }
      console.warn('⚠️ No redirect param or referrer, defaulting to /');
    } catch (error) {
      console.error('❌ Error parsing redirect:', error);
    }
  }, []);

  // Auto-redirect after 3-second countdown
  useEffect(() => {
    if (returnTo === '/') {
      console.log('⏭️ No redirect URL, skipping auto-redirect');
      return;
    }

    console.log('⏱️ Starting 3-second countdown to:', returnTo);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          console.log('🚀 Redirecting to:', returnTo);
          router.push(returnTo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [returnTo, router]);

  const supportEmail = useMemo(() => {
    return process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com';
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <style dangerouslySetInnerHTML={{ __html: `
        .ty-card {
          max-width: 720px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.06);
          padding: 28px;
          text-align: center;
        }
        .ty-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 9999px;
          background: #e8f5e9;
          color: #16a34a;
          font-size: 26px;
          margin: 0 auto 12px;
        }
        .ty-title {
          font-size: 28px;
          font-weight: 800;
          color: #111827;
          margin-bottom: 6px;
        }
        .ty-sub {
          color: #374151;
          margin-bottom: 18px;
        }
        .ty-list {
          text-align: left;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 14px 16px;
          margin: 12px 0 22px;
          color: #374151;
        }
        .ty-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn {
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 600;
          border: 1px solid transparent;
          transition: all .15s ease;
        }
        .btn-primary {
          background: #111827;
          color: #fff;
        }
        .btn-primary:hover { background: #0b1220; }
        .btn-outline {
          background: #fff;
          color: #111827;
          border-color: #e5e7eb;
        }
        .btn-outline:hover { background: #f3f4f6; }
        .ty-countdown {
          color: #6b7280;
          font-size: 14px;
          margin-top: 8px;
        }
        .ty-countdown strong {
          color: #111827;
          font-weight: 600;
        }
      `}} />
      <div className="ty-card">
        <div className="ty-badge">✓</div>
        <h1 className="ty-title">Payment Successful</h1>
        <p className="ty-sub">Thank you! Your payment was received and is being processed.</p>

        <div className="ty-list">
          <ul className="list-disc pl-5">
            <li>We've emailed a receipt to you.</li>
            <li>If this was for a booking, the provider will contact you shortly.</li>
            <li>For questions, contact us at {supportEmail}.</li>
          </ul>
        </div>

        {countdown > 0 && (
          <p className="ty-countdown">
            Redirecting you back in <strong>{countdown}</strong> second{countdown !== 1 ? 's' : ''}...
          </p>
        )}
      </div>
    </div>
  );
}

