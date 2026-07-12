/**
 * Signed effect of a transaction on a party's balance, in paise.
 * Positive balance = party owes us (receivable). Negative = we owe them (payable).
 */
export function signedBalanceDelta(type: string, amount: number): number {
  switch (type) {
    case "sale":
    case "debit_note":
      return amount; // party owes us more
    case "payment_in":
    case "credit_note":
      return -amount; // reduces what they owe us
    case "purchase":
      return -amount; // we owe the supplier
    case "payment_out":
      return amount; // paying the supplier moves the payable back toward zero
    default:
      return 0; // estimates, orders, challans don't affect the ledger
  }
}
