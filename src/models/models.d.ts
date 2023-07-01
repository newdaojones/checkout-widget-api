import { CheckoutRequest } from './CheckoutRequest';
import { Checkout } from './Checkout';
import { AssetTransfer } from './AssetTransfer';
import { Charge } from './Charge';
import { User } from './User';
import { Partner } from './Partner';

export interface IDbModels {
  Checkout: typeof Checkout;
  CheckoutRequest: typeof CheckoutRequest;
  AssetTransfer: typeof AssetTransfer;
  Charge: typeof Charge;
  User: typeof User;
  Partner: typeof Partner;
}
