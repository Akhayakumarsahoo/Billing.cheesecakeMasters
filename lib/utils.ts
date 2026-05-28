import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date Utilities ────────────────────────────────────────

/** Format a Date as "YYYY-MM-DD" in local time (no UTC drift). */
export function getLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a `from` / `to` date-string pair into start/end Date boundaries.
 * Falls back to today if either value is missing or invalid.
 */
export function parseDateRange(
  from?: string,
  to?: string,
): { start: Date; end: Date; todayStr: string } {
  const todayStr = getLocalDateString(new Date());
  const fromStr = from || todayStr;
  const toStr = to || todayStr;

  let start = new Date(`${fromStr}T00:00:00.000`);
  let end = new Date(`${toStr}T23:59:59.999`);

  if (!isFinite(start.getTime()) || !isFinite(end.getTime())) {
    start = new Date(`${todayStr}T00:00:00.000`);
    end = new Date(`${todayStr}T23:59:59.999`);
  }

  return { start, end, todayStr };
}

// ── Money Utilities ───────────────────────────────────────

/** Format a number as Indian Rupee locale string with 2 decimal places. */
export function formatINR(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Payment Bucketing ─────────────────────────────────────

export interface PaymentBuckets {
  cash: number;
  card: number;
  online: number; // UPI + netbanking
  other: number;
  notPaid: number; // grand total - paid amount
}

/**
 * Aggregate a flat list of bill payments into totals per mode.
 * `grandTotal` is the bill's grand total (as a number) used to compute
 * the "not paid" remainder for partially paid bills.
 */
export function bucketPayments(
  bills: { grandTotal: { toNumber(): number }; payments: { mode: string; amount: { toNumber(): number } }[] }[],
): PaymentBuckets {
  const buckets: PaymentBuckets = { cash: 0, card: 0, online: 0, other: 0, notPaid: 0 };

  for (const bill of bills) {
    let paidForBill = 0;
    for (const p of bill.payments) {
      const amount = p.amount.toNumber();
      paidForBill += amount;
      const mode = p.mode.toLowerCase();
      if (mode === "cash") {
        buckets.cash += amount;
      } else if (mode === "card") {
        buckets.card += amount;
      } else if (mode === "upi" || mode === "online" || mode === "netbanking") {
        buckets.online += amount;
      } else {
        buckets.other += amount;
      }
    }
    const grandTotal = bill.grandTotal.toNumber();
    if (grandTotal > paidForBill) {
      buckets.notPaid += grandTotal - paidForBill;
    }
  }

  return buckets;
}
