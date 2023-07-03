// MODULES
import * as express from 'express';
import { CheckoutRequest } from '../models/CheckoutRequest';
import { Config } from '../config';
import { authMiddlewareForPartner } from '../middleware/auth';
import { check, validationResult } from 'express-validator';
import { Partner } from '../models/Partner';
import { UserService } from '../services/userService';
import { log } from '../utils';
const router = express.Router();

router.post('/partners', async (req, res) => {
  const data = req.body

  log.info({
    func: 'partners',
    data
  })

  try {
    await check('email', 'Email is required').notEmpty().run(req);
    await check('email', 'Email is invalid').isEmail().run(req);
    await check('password', 'Password is required').notEmpty().run(req);
    await check('password', 'Please set strong password').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).run(req);
    await check('phoneNumber', 'Phone number is required').notEmpty().run(req);
    await check('phoneNumber', 'Phone number is invalid').isMobilePhone('en-US').run(req);
    await check('companyName', 'Company name is required').notEmpty().run(req);
    await check('firstName', 'First name is required').notEmpty().run(req);
    await check('lastName', 'Last name is required').notEmpty().run(req);
    await check('streetAddress', 'Street address is required').notEmpty().run(req);
    await check('city', 'City is required').notEmpty().run(req);
    await check('state', 'State is required').notEmpty().run(req);
    await check('postalCode', 'Postal code is required').notEmpty().run(req);
    await check('postalCode', 'Postal code is invalid').isPostalCode('US').run(req);
    await check('country', 'Country is required').notEmpty().run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.throw();
    }

    const partner = await Partner.create(data)

    res.status(201).json({
      id: partner.id,
      message: 'Created your account successfully. It will take 2 or 3 business day for approve your account.'
    })
  } catch (err) {
    log.warn({
      func: 'partners',
      data,
      err
    }, 'Failed create partner')

    if (err.mapped()) {
      return res.status(422).send({
        message: 'Failed validation',
        errors: err.mapped()
      })
    }

    res.status(400).send(err.message || 'Error');
  }
})

router.post('/partners/login', async (req, res) => {
  try {
    await check('email', 'Email is invalid').isEmail().run(req);
    await check('password', 'Password cannot be blank').notEmpty().run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.throw();
    }

    const { email, password } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const userAgent = req.headers['user-agent'];

    const partner = await Partner.findPartner(email, password)

    if (!partner.isApproved) {
      throw new Error('Your account is not approved yet. please wait.')
    }

    if (!partner) {
      throw new Error('Invalid email or password')
    }

    const token = await UserService.generateJWTToken({
      id: partner.id,
      email: partner.email,
      ipAddress,
      userAgent
    })

    return res.status(202).json({ token });
  } catch (error) {
    if (error.mapped()) {
      return res.status(422).send({
        message: 'Failed validation',
        errors: error.mapped()
      })
    }

    res.status(401).send(error.message || 'Error');
  }
});

router.patch('/partners/webhook', authMiddlewareForPartner, async (req, res) => {
  const partner = req.partner;
  const webhook = req.body.webhook

  log.info({
    func: 'partners/webhook',
    webhook,
    partnerId: partner?.id
  })
  try {
    await check('webhook', 'Webhook url is required').notEmpty().run(req);
    await check('webhook', 'Webhook url is invalid').isURL().run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.throw();
    }

    if (!partner) {
      throw new Error('Partner not found')
    }

    await partner.update({
      webhook
    })

    res.status(200).send('success')
  } catch (error) {
    if (error.mapped()) {
      return res.status(422).send({
        message: 'Failed validation',
        errors: error.mapped()
      })
    }

    res.status(400).send(error.message || 'Error');
  }
})

router.post('/partners/login', async (req, res) => {
  try {
    await check('email', 'Email is required').notEmpty().run(req);
    await check('email', 'Email is invalid').isEmail().run(req);
    await check('password', 'Password is required').notEmpty().run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.throw();
    }

    const { email, password } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const userAgent = req.headers['user-agent'];

    const partner = await Partner.findPartner(email, password)

    if (!partner.isApproved) {
      throw new Error('Your account is not approved yet. please wait.')
    }

    if (!partner) {
      throw new Error('Invalid email or password')
    }

    const token = await UserService.generateJWTToken({
      id: partner.id,
      email: partner.email,
      ipAddress,
      userAgent
    })

    return res.status(202).json({ token });
  } catch (error) {
    if (error.mapped()) {
      return res.status(422).send({
        message: 'Failed validation',
        errors: error.mapped()
      })
    }

    res.status(401).send(error.message || 'Error');
  }
});

router.post('/partners/orders', authMiddlewareForPartner, async (req, res) => {
  const data = req.body;
  const partner = req.partner

  log.info({
    func: '/partners/orders',
    data,
    partnerId: partner?.id
  }, 'Start create partner order')

  try {
    await check('phoneNumber', 'Phone number is required').notEmpty().run(req);
    await check('phoneNumber', 'Phone number is invalid').isMobilePhone('en-US').run(req);
    await check('amount', 'Amount is required').notEmpty().run(req);
    await check('amount', 'Amount should numeric').isNumeric().run(req);
    await check('walletAddress', 'Wallet address is required').notEmpty().run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.throw();
    }


    if (!partner.isApproved) {
      throw new Error('Your account is not approved yet. please wait.')
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
    log.warn({
      func: '/partners/orders',
      data,
      partnerId: partner?.id,
      err: error
    }, 'Failed create partner order')


    if (error.mapped()) {
      return res.status(422).send({
        message: 'Failed validation',
        errors: error.mapped()
      })
    }

    res.status(401).send(error.message || 'Error');
  }
});

export = router;
