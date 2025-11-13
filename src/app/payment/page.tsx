'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DollarSign, CreditCard, CheckCircle } from 'lucide-react';

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const [paymentData, setPaymentData] = useState({
    serviceId: '',
    userId: '',
    amount: 0,
    serviceName: '',
    description: ''
  });
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Extract payment data from URL parameters
    const serviceId = searchParams.get('serviceId') || '';
    const userId = searchParams.get('userId') || '';
    const amount = parseFloat(searchParams.get('amount') || '0');
    const serviceName = searchParams.get('serviceName') || '';
    const description = searchParams.get('description') || '';

    setPaymentData({
      serviceId,
      userId,
      amount,
      serviceName,
      description
    });
  }, [searchParams]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600 mb-6">
              Thank you for your payment. You will receive a confirmation email shortly.
            </p>
            <div className="bg-white rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Payment Details</h3>
              <p className="text-sm text-gray-600">Service: {paymentData.serviceName}</p>
              <p className="text-sm text-gray-600">Amount: R{paymentData.amount}</p>
            </div>
            <button
              onClick={() => window.close()}
              className="btn-primary w-full"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
            <p className="text-gray-600">Pay for your service securely</p>
          </div>

          {/* Service Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">{paymentData.serviceName}</h3>
            <p className="text-sm text-gray-600 mb-2">{paymentData.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Amount</span>
              <span className="text-lg font-bold text-gray-900">R{paymentData.amount}</span>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={customerInfo.firstName}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, firstName: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={customerInfo.lastName}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastName: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                className="input-field"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="paymentMethod" value="card" className="mr-3" defaultChecked />
                  <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm">Credit/Debit Card</span>
                </label>
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="paymentMethod" value="eft" className="mr-3" />
                  <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm">EFT/Bank Transfer</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing Payment...' : `Pay R${paymentData.amount}`}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              This is a demo payment page. In production, this would integrate with PayFast.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
