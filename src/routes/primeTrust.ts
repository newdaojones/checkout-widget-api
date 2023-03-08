// MODULES
import * as express from 'express';
import { CheckoutService } from '../services/checkout';

const router = express.Router();
const checkoutService = CheckoutService.getInstance()

router.post('/primeTrustWebhook', async (req, res) => {
  try {
    const data = req.body
    checkoutService.webhookHandler(data)
    res.status(200).send(`Webhook Received: ${data.id}`);

  } catch (error) {
    res.send('Invalid token');
  }
});

export = router;
