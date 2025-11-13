'use client';

import { XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Cancel Header */}
          <div className="bg-red-50 border-b border-red-200 px-6 py-8">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Cancelled
              </h1>
              <p className="text-gray-600">
                Your subscription upgrade was not completed.
              </p>
            </div>
          </div>

          {/* Cancel Details */}
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                No Changes Made
              </h2>
              <p className="text-gray-600">
                Your account remains on the current plan. You can try upgrading again anytime.
              </p>
            </div>

            {/* Common Reasons */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">💡 Why This Happens</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-900">Changed your mind</p>
                    <p className="text-sm text-gray-600">That's completely fine - no pressure!</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-900">Payment issues</p>
                    <p className="text-sm text-gray-600">Technical issues or payment method problems.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-gray-900">Timing</p>
                    <p className="text-sm text-gray-600">You might want to upgrade at a different time.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard/subscription"
                className="flex-1 btn-primary text-center"
              >
                <RefreshCw className="h-4 w-4 mr-2 inline" />
                Try Again
              </Link>
              <Link
                href="/dashboard"
                className="flex-1 btn-secondary text-center"
              >
                Back to Dashboard
              </Link>
            </div>

            {/* Help */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Need help? <a href="mailto:support@yourwebsite.com" className="text-blue-600 hover:text-blue-700">Contact support</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
