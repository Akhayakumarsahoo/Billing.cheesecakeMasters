import { Decimal } from "@/lib/db";

export interface LineItemInput {
  basePrice: Decimal;
  quantity: Decimal;
  gstRate: Decimal;
}

export interface LineItemTotals {
  lineBaseTotal: Decimal;
  lineGstAmount: Decimal;
  lineCgst: Decimal;
  lineSgst: Decimal;
  lineTotal: Decimal;
  gstRate: Decimal;
}

export interface BillTotals {
  subtotal: Decimal;
  totalCgst: Decimal;
  totalSgst: Decimal;
  totalGst: Decimal;
  grandTotal: Decimal;
}

export function computeLineItem(input: LineItemInput): LineItemTotals {
  const lineBaseTotal = input.basePrice.mul(input.quantity);
  const lineGstAmount = lineBaseTotal.mul(input.gstRate).div(100);
  const lineCgst = lineGstAmount.div(2);
  const lineSgst = lineGstAmount.div(2);
  const lineTotal = lineBaseTotal.add(lineGstAmount);

  return {
    lineBaseTotal,
    lineGstAmount,
    lineCgst,
    lineSgst,
    lineTotal,
    gstRate: input.gstRate,
  };
}

export function computeBillTotals(lineItems: LineItemTotals[], discountAmount: Decimal = new Decimal(0)): BillTotals {
  const zero = new Decimal(0);

  const subtotal = lineItems.reduce(
    (sum, li) => sum.add(li.lineBaseTotal),
    zero,
  );

  const discountRatio = subtotal.greaterThan(zero) ? discountAmount.div(subtotal) : zero;

  let totalCgst = zero;
  let totalSgst = zero;

  lineItems.forEach((li) => {
    const discountedLineBaseTotal = li.lineBaseTotal.mul(new Decimal(1).sub(discountRatio));
    const discountedLineGst = discountedLineBaseTotal.mul(li.gstRate).div(100);
    const lineCgst = discountedLineGst.div(2);
    const lineSgst = discountedLineGst.div(2);

    totalCgst = totalCgst.add(lineCgst);
    totalSgst = totalSgst.add(lineSgst);
  });

  const totalGst = totalCgst.add(totalSgst);
  const rawTotal = subtotal.sub(discountAmount).add(totalGst);
  const grandTotal = new Decimal(Math.max(0, Math.round(rawTotal.toNumber())));

  return { subtotal, totalCgst, totalSgst, totalGst, grandTotal };
}
