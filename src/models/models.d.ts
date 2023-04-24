import { CheckoutRequest } from './CheckoutRequest';
import { Checkout } from './Checkout';
import { PrimeTrustAccount } from './PrimeTrustAccount';
import { AssetQuote } from './AssetQuote';
import { AssetTransfer } from './AssetTransfer';
import { FundsTransfer } from './FundsTransfer';
import { Charge } from './Charge';
import { User } from './User';
import { CipCheck } from './CipCheck';
export interface IDbModels {
  PrimeTrustAccount: typeof PrimeTrustAccount;
  Checkout: typeof Checkout;
  CheckoutRequest: typeof CheckoutRequest;
  AssetQuote: typeof AssetQuote;
  AssetTransfer: typeof AssetTransfer;
  FundsTransfer: typeof FundsTransfer;
  Charge: typeof Charge;
  User: typeof User;
  CipCheck: typeof CipCheck;
}
