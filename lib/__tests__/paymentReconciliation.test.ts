import { describe, it, expect } from 'vitest';
import { runPaymentReconciliation } from '../server/razorpay';
import { db } from '../server/db';

describe('Payment Reconciliation Engine', () => {
  it('runs reconciliation scan and returns structured array of order-payment comparisons', () => {
    const report = runPaymentReconciliation();
    expect(Array.isArray(report)).toBe(true);

    // Existing orders should appear in the reconciliation report
    if (report.length > 0) {
      const first = report[0];
      expect(first.orderNumber).toBeDefined();
      expect(first.orderId).toBeDefined();
      expect(typeof first.orderTotal).toBe('number');
      expect(first.orderStatus).toBeDefined();
      expect(first.orderPaymentStatus).toBeDefined();
      expect(['MATCHED', 'MISMATCH', 'PENDING_REVIEW', 'REFUNDED', 'PARTIALLY_REFUNDED']).toContain(
        first.reconciliationStatus
      );
    }
  });

  it('correctly flags orders with no payment record as PENDING_REVIEW or MISMATCH', () => {
    const report = runPaymentReconciliation();
    for (const item of report) {
      if (!item.paymentRecordId) {
        if (item.orderPaymentStatus === 'Paid') {
          expect(item.reconciliationStatus).toBe('MISMATCH');
          expect(item.mismatchReason).toContain('no payment record');
        } else {
          expect(item.reconciliationStatus).toBe('PENDING_REVIEW');
        }
      }
    }
  });
});
