import { Prisma } from "@prisma/client";
type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

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
  };
}

export function computeBillTotals(lineItems: LineItemTotals[]): BillTotals {
  const zero = new Decimal(0);

  const subtotal = lineItems.reduce(
    (sum, li) => sum.add(li.lineBaseTotal),
    zero,
  );
  const totalCgst = lineItems.reduce((sum, li) => sum.add(li.lineCgst), zero);
  const totalSgst = lineItems.reduce((sum, li) => sum.add(li.lineSgst), zero);
  const totalGst = totalCgst.add(totalSgst);
  const grandTotal = subtotal.add(totalGst);

  return { subtotal, totalCgst, totalSgst, totalGst, grandTotal };
}
