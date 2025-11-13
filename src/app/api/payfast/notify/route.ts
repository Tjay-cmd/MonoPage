import { NextRequest, NextResponse } from 'next/server';
import { payFastService } from '@/lib/payfast';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    // Verify the signature
    if (!payFastService.verifyCallback(data)) {
      console.error('Invalid PayFast signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const {
      m_payment_id,
      pf_payment_id,
      payment_status,
      amount_gross,
      amount_fee,
      amount_net,
      name_first,
      name_last,
      email_address,
      custom_str1: userId,
      custom_str2: serviceId,
    } = data;

    // Update transaction status in Firestore
    if (payment_status === 'COMPLETE') {
      // Create transaction record
      await addDoc(collection(db, 'transactions'), {
        userId,
        serviceId,
        payfastTransactionId: pf_payment_id,
        amount: parseFloat(amount_gross),
        fee: parseFloat(amount_fee),
        netAmount: parseFloat(amount_net),
        status: 'completed',
        customerEmail: email_address,
        customerName: `${name_first} ${name_last}`,
        createdAt: new Date(),
        completedAt: new Date(),
      });

      // Update user tier if needed (this would be handled by a separate function)
      // await checkAndUpdateUserTier(userId);
    }

    return NextResponse.text('OK');
  } catch (error) {
    console.error('PayFast notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
