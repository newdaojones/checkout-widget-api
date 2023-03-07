import { Checkout } from './Checkout';
import { PrimeTrustAccount } from './PrimeTrustAccount';
import { AssetQuote } from './AssetQuote';
import { AssetTransfer } from './AssetTransfer';
import { FundsTransfer } from './FundsTransfer';
import { Charge } from './Charge';
export interface IDbModels {
  Checkout: typeof Checkout;
  PrimeTrustAccount: typeof PrimeTrustAccount;
  AssetQuote: typeof AssetQuote;
  AssetTransfer: typeof AssetTransfer;
  FundsTransfer: typeof FundsTransfer;
  Charge: typeof Charge;
}
