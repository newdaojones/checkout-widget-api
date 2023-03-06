import { Checkout } from './Checkout';
import { PrimeTrustAccount } from './PrimeTrustAccount';

export interface IDbModels {
  Checkout: typeof Checkout;
  PrimeTrustAccount: typeof PrimeTrustAccount;
}
