// TS_NODE_FILES=true node_modules/.bin/ts-node src/scripts/addCustodialAccount.ts

import '../models';
import { PrimeTrustService } from '../services/primeTrust';
import { Config } from '../config';
import { CustodialAccount } from '../models/CustodialAccount';
import { Checkout } from '../models/Checkout';

export const migrateCustodialAccount = async () => {
  const primeTrustService = PrimeTrustService.getInstance()
  const contract = await primeTrustService.getContact(Config.primeTrustContactId)
  const account = await primeTrustService.getAccount(Config.primeTrustAccountId)
  const address = contract.included.find((entry) => entry.type === 'addresses')
  const phoneNumber = contract.included.find((entry) => entry.type === 'phone-numbers')
  const custodialAccount = await CustodialAccount.create({
    id: account.data.id,
    contactId: contract.data.id,
    status: account.data.attributes.status,
    firstName: contract.data.attributes['first-name'],
    lastName: contract.data.attributes['last-name'],
    email: contract.data.attributes['email'],
    phoneNumber: `+1${phoneNumber.attributes['client-input'].replace('-', '')}`,
    gender: contract.data.attributes['sex'] || 'male',
    dob: contract.data.attributes['date-of-birth'],
    taxId: contract.data.attributes['tax-id-number'],
    streetAddress: address.attributes['street-1'],
    streetAddress2: address.attributes['street-2'],
    city: address.attributes['city'],
    state: address.attributes['region'],
    zip: address.attributes['postal-code'],
    country: address.attributes['country'],
    identityConfirmed: contract.data.attributes['identity-confirmed'],
    identityDocumentsVerified: contract.data.attributes['identity-documents-verified'],
    proofOfAddressDocumentsVerified: contract.data.attributes['proof-of-address-documents-verified'],
    amlCleared: contract.data.attributes['aml-cleared'],
    cipCleared: contract.data.attributes['cip-cleared'],
  })

  await Checkout.update({
    custodialAccountId: custodialAccount.id,
  }, { where: {} })
};

(async () => {
  await migrateCustodialAccount();
})();
