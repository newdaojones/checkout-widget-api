import { Charge } from "../models/Charge"
import { FundsTransfer } from "../models/FundsTransfer"
import { newDinero } from "./dinero"

export const convertToCharge = (charge: any): Charge => {
  const chargeAmount = newDinero(charge.amount, charge.currency)
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
    bin: charge.source?.bin
  } as Charge
}

export const convertToFundsTransfer = (data: any): FundsTransfer => {
  return {
    id: data.id,
    status: data.attributes.status,
    amount: data.attributes.amount,
    amountExcepted: data.attributes['amount-expected'],
    currencyType: data.attributes['currency-type'],
    cancelledAt: data.attributes['cancelled-at'],
    cancellationDetails: data.attributes['cancellation-details'],
    clearsOn: data.attributes['clears-on'],
    contingenciesClearedAt: data.attributes['contingencies-cleared-at'],
    contingenciesClearedOn: data.attributes['contingencies-cleared-on'],
    equalityHash: data.attributes['equality-hash'],
    fundsSourceName: data.attributes['funds-source-name'],
    fundsTransferType: data.attributes['funds-transfer-type'],
    nachaIndividualId: data.attributes['nacha-individual-id'],
    privateMemo: data.attributes['private-memo'],
    receivedChargeBack: data.attributes['received-chargeback'],
    receiverName: data.attributes['receiver-name'],
    reference: data.attributes['reference'],
    reviewReasons: data.attributes['review-reasons'],
    reversedAmount: data.attributes['reversed-amount'],
    reversalDetails: data.attributes['reversal-details'],
    reversedAt: data.attributes['reversed-at'],
    settledAt: data.attributes['settled-at'],
    settlementDetails: data.attributes['settlement-details'],
    signetDepositAddress: data.attributes['signet-deposit-address'],
    specialInstructions: data.attributes['special-instructions'],
    specialType: data.attributes['special-type'],
    wireInstructions: data.attributes['wire-instructions'],
    wireInstructionsIntl: data.attributes['wire-instructions-intl'],
    altCurrencyWireInstructions: data.attributes['alt-currency-wire-instructions'],
  } as FundsTransfer
}

export const convertToQuote = (data: any) => {
  return {
    id: data.id,
    status: data.attributes.status,
    assetName: data.attributes['asset-name'],
    baseAmount: data.attributes['base-amount'],
    feeAmount: data.attributes['fee-amount'],
    totalAmount: data.attributes['total-amount'],
    pricePerUnit: data.attributes['price-per-unit'],
    unitCount: data.attributes['unit-count'],
    hot: data.attributes.hot,
    delayedSettlement: data.attributes['delayed-settlement'],
    integratorSettled: data.attributes['integrator-settled'],
    executedAt: data.attributes['executed-at'],
    expiresAt: data.attributes['expires-at'],
    rejectedAt: data.attributes['rejected-at'],
    settledAt: data.attributes['settled-at'],
  }
}