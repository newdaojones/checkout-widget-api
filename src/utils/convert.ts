import { chargeMessages } from "../errors/chargeErrors";
import { Charge } from "../models/Charge";
import { newDinero } from "./dinero";

export const convertToCharge = (charge: any): Charge => {
  const chargeAmount = newDinero(charge.amount, charge.currency);
  return {
    id: charge.id,
    status: charge.status,
    amount: chargeAmount.toUnit(),
    currency: chargeAmount.getCurrency(),
    approved: charge.approved,
    flagged: charge.risk?.flagged,
    processedOn: charge.processed_on,
    reference: charge.reference,
    last4: charge.source?.last4,
    bin: charge.source?.bin,
    code: charge.response_code,
    message: chargeMessages[charge.response_code],
  } as Charge;
};
