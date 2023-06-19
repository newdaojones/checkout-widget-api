// MODULES
import * as express from 'express';
import { CheckoutRequest } from '../models/CheckoutRequest';
import { Config } from '../config';
import { authMiddlewareForPartner } from '../middleware/auth';
const router = express.Router();

router.post('/checkoutRequest', authMiddlewareForPartner, async (req, res) => {
  try {
    const data = req.body;
    const partner = req.partner
    if (!data.phoneNumber) {
      throw new Error('Required phone number')
    }

    if (!data.amount) {
      throw new Error('Required amount')
    }

    if (!data.walletAddress) {
      throw new Error('Required wallet address')
    }

    const checkoutRequest = await CheckoutRequest.generateCheckoutRequest({
      ...data,
      partnerId: partner.id
    })
    res.status(200).json({
      id: checkoutRequest.id,
      uri: `${Config.frontendUri}/${checkoutRequest.id}`
    });

  } catch (error) {
    console.log(error)
    res.status(422).send(error.message || 'Error');
  }
});

export = router;
