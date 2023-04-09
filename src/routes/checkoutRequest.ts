// MODULES
import * as express from 'express';
import { CheckoutRequest } from '../models/CheckoutRequest';
import { Config } from '../config';
const router = express.Router();

router.post('/checkoutRequest', async (req, res) => {
  try {
    const data = req.body;
    if (!data.phoneNumber) {
      throw new Error('Required phone number')
    }

    if (!data.amount) {
      throw new Error('Required amount')
    }

    if (!data.walletAddress) {
      throw new Error('Required wallet address')
    }

    const checkoutRequest = await CheckoutRequest.create(data)
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
