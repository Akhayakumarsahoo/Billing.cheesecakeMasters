import { prisma, Decimal } from "./db";

/**
 * Calculates system billed sales for a specific date and outlet.
 */
export async function getBilledSalesForDate(outletId: string, dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000`);
  const end = new Date(`${dateStr}T23:59:59.999`);

  const bills = await prisma.bill.findMany({
    where: {
      outletId,
      status: "printed",
      completedAt: { gte: start, lte: end },
    },
    include: { payments: true },
  });

  let billedCash = new Decimal(0);
  let billedUpi = new Decimal(0);
  let billedCard = new Decimal(0);

  for (const bill of bills) {
    for (const payment of bill.payments) {
      const amt = payment.amount;
      const mode = payment.mode;
      if (mode === "cash") {
        billedCash = billedCash.plus(amt);
      } else if (mode === "upi") {
        billedUpi = billedUpi.plus(amt);
      } else if (mode === "card") {
        billedCard = billedCard.plus(amt);
      }
    }
  }

  return {
    billedCash,
    billedUpi,
    billedCard,
    totalBilled: billedCash.plus(billedUpi).plus(billedCard),
  };
}

/**
 * Gets the opening cash balance for a specific date and outlet.
 * It is derived from the closing cash of the latest chronological active settlement before this date.
 */
export async function getOpeningCashForDate(outletId: string, dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);

  const previousSettlement = await prisma.dailySettlement.findFirst({
    where: {
      outletId,
      settlementDate: {
        lt: date,
      },
      status: "active",
    },
    orderBy: {
      settlementDate: "desc",
    },
  });

  return previousSettlement ? previousSettlement.closingCash : new Decimal(0);
}

/**
 * Propagates cash balances chronologically starting from a specific date.
 */
export async function propagateCashBalances(outletId: string, startDate: Date) {
  // Find all active settlements on or after startDate in ascending order
  const settlements = await prisma.dailySettlement.findMany({
    where: {
      outletId,
      settlementDate: {
        gte: startDate,
      },
      status: "active",
    },
    orderBy: {
      settlementDate: "asc",
    },
  });

  // Find the closing cash of the latest active settlement before startDate
  const previousSettlement = await prisma.dailySettlement.findFirst({
    where: {
      outletId,
      settlementDate: {
        lt: startDate,
      },
      status: "active",
    },
    orderBy: {
      settlementDate: "desc",
    },
  });

  let currentOpeningCash = previousSettlement ? previousSettlement.closingCash : new Decimal(0);

  for (const settlement of settlements) {
    const opening = currentOpeningCash;
    const closing = opening
      .plus(settlement.actualCash)
      .minus(settlement.cashExpense)
      .minus(settlement.cashWithdraw);

    await prisma.dailySettlement.update({
      where: { id: settlement.id },
      data: {
        openingCash: opening,
        closingCash: closing,
      },
    });

    currentOpeningCash = closing;
  }
}
