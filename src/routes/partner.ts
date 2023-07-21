import { Config } from '../config';

// MODULES
import * as express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { check, validationResult } from 'express-validator';

import { authMiddlewareForPartner } from '../middleware/auth';

import { CheckoutRequest } from '../models/CheckoutRequest';
import { Partner } from '../models/Partner';

import { UserService } from '../services/userService';
import { BridgeService } from '../services/bridgeService';

import { log } from '../utils';
import { AgreementLink } from '../models/AgreementLink';
import { KycLink } from '../models/KycLink';
import { WhereOptions } from 'sequelize';
import { UserStatus } from '../types/userStatus.type';

const router = express.Router();
const bridgeService = BridgeService.getInstance()

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
    await check('dob', 'Birthday is required').notEmpty().run(req);
    await check('ssn', 'SSN is required').notEmpty().run(req);
    await check('ssn', 'SSN is invalid').matches(/^[0-9]{3}-[0-9]{2}-[0-9]{4}$/).run(req);
    await check('streetAddress', 'Street address is required').notEmpty().run(req);
    await check('city', 'City is required').notEmpty().run(req);
    await check('state', 'State is required').notEmpty().run(req);
    await check('postalCode', 'Postal code is required').notEmpty().run(req);
    await check('postalCode', 'Postal code is invalid').isPostalCode('US').run(req);
    await check('country', 'Country is required').notEmpty().run(req);
    await check('webhook', 'Webhook url is invalid').optional().isURL().run(req);
    await check('signedAgreementId', 'Signed agreement ID is required').notEmpty().run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.throw();
    }

    const existingUserEmail = await Partner.findOne({
      where: {
        email: data.email
      }
    })

    if (existingUserEmail) {
      throw new Error(`Already exists account with email: ${data.email}`)
    }


    const existingUserPhoneNumber = await Partner.findOne({
      where: {
        phoneNumber: data.phoneNumber
      }
    })

    if (existingUserPhoneNumber) {
      throw new Error(`Already exists account with phone number: ${data.email}`)
    }

    const idempotenceId = uuidv4()
    const response = await bridgeService.createCustomer({
      type: 'business',
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phoneNumber,
      address: {
        street_line_1: data.streetAddress,
        street_line_2: data.streetAddress2,
        city: data.city,
        state: data.state,
        postal_code: data.postalCode,
        country: data.country
      },
      dob: data.dob,
      ssn: data.ssn,
      signed_agreement_id: data.signedAgreementId
    }, idempotenceId)

    const partner = await Partner.create({
      ...data,
      id: response.id,
      status: response.status
    })

    res.status(201).json({
      id: partner.id,
      message: 'Created your account successfully.'
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

    res.status(400).send({
      message: err.message || 'Error'
    });
  }
})

router.post('/partners/login', async (req, res) => {
  try {
    await check('email', 'Email is invalid').optional().isEmail().run(req);
    await check('password', 'Password cannot be blank').notEmpty().run(req);
    await check('password', 'Please set strong password').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.throw();
    }

    const { email, password } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const userAgent = req.headers['user-agent'];

    const partner = await Partner.findPartner(email, password)

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
    if (error.mapped && error.mapped()) {
      return res.status(422).send({
        message: 'Failed validation',
        errors: error.mapped()
      })
    }

    res.status(400).send({
      message: error.message || 'Error'
    });
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

    res.status(200).send({
      message: "success"
    })
  } catch (error) {
    if (error.mapped && error.mapped()) {
      return res.status(422).send({
        message: 'Failed validation',
        errors: error.mapped()
      })
    }

    res.status(400).send({
      message: error.message || 'Error'
    });
  }
})

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


    if (error.mapped && error.mapped()) {
      return res.status(422).send({
        message: 'Failed validation',
        errors: error.mapped()
      })
    }

    res.status(400).send({
      message: error.message || 'Error'
    });
  }
});

router.get('/partners/orders', authMiddlewareForPartner, async (req, res) => {
  const data = req.query;
  const partner = req.partner;

  log.info({
    func: '/partners/orders',
    data,
    partnerId: partner?.id
  }, 'Start get partner orders')

  try {
    await check('offset', 'Offset is required').notEmpty().run(req);
    await check('offset', 'Offset is invalid').isInt().run(req);
    await check('limit', 'Limit is required').notEmpty().run(req);
    await check('limit', 'Limit is invalid').isInt().run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.throw();
    }

    const status = data.status as string;
    const offset = data.offset ? Number(data.offset) : 0
    const limit = Math.min((data.limit ? Number(data.limit) : 10), 50)

    const checkoutRequestCriteria: WhereOptions = {
      partnerId: partner.id
    }

    if (data.status) {
      checkoutRequestCriteria.status = data.status as string
    }

    const checkoutRequests = await CheckoutRequest.findAndCountAll({
      attributes: ['id', 'partnerOrderId', 'email', 'phoneNumber', 'amount', 'status', 'transactionHash'],
      where: checkoutRequestCriteria,
      offset,
      limit
    })

    res.status(200).json(checkoutRequests);

  } catch (error) {
    log.warn({
      func: '/partners/orders',
      data,
      partnerId: partner?.id,
      err: error
    }, 'Failed get partner orders')


    if (error.mapped && error.mapped()) {
      return res.status(422).send({
        message: 'Failed validation',
        errors: error.mapped()
      })
    }

    res.status(400).send({
      message: error.message || 'Error'
    });
  }
})

router.get('/partners/orders/:id', authMiddlewareForPartner, async (req, res) => {
  const id = req.params.id;
  const partner = req.partner;

  log.info({
    func: '/partners/orders/:id',
    id,
    partnerId: partner?.id
  }, 'Start get partner single order')

  try {
    const checkoutRequest = await CheckoutRequest.findOne({
      attributes: ['id', 'partnerOrderId', 'email', 'phoneNumber', 'amount', 'status', 'transactionHash'],
      where: {
        partnerId: partner.id,
        id
      }
    })

    res.status(200).json(checkoutRequest);

  } catch (error) {
    log.warn({
      func: '/partners/orders/:id',
      id,
      partnerId: partner?.id,
      err: error
    }, 'Failed get partner orders')

    if (error.mapped && error.mapped()) {
      return res.status(422).send({
        message: 'Failed validation',
        errors: error.mapped()
      })
    }

    res.status(400).send({
      message: error.message || 'Error'
    });
  }
})

router.post('/partners/tos_link', async (req, res) => {
  try {
    const idempotenceId = uuidv4()
    const link = await bridgeService.createTermsOfServiceUrl(idempotenceId)

    await AgreementLink.create({
      id: idempotenceId,
      link
    })

    return res.status(200).json({ link });
  } catch (err) {
    log.warn({
      func: '/partners/orders',
      err
    }, 'Failed get tos link')


    res.status(400).send({
      message: err.message || 'Error'
    });
  }
})

router.get('/partners/kyb_success/sandbox', authMiddlewareForPartner, async (req, res) => {
  const partner = req.partner;

  try {
    if (Config.isProduction) {
      throw new Error('Not allowed sandbox on production')
    }

    const partnerRecord = await Partner.findByPk(partner.id);

    await partnerRecord.update({
      status: UserStatus.Active
    })

    return res.status(200).json({ message: 'Approved your account' });
  } catch (err) {
    log.warn({
      func: '/partners/kyb_success/sandbox',
      err
    }, 'Failed approve KYB')

    res.status(400).send({
      message: err.message || 'Error'
    });
  }
})

router.get('/partners/kyb_link', authMiddlewareForPartner, async (req, res) => {
  try {
    await check('redirectUri', 'Redirect URI is required').notEmpty().run(req);
    await check('redirectUri', 'Redirect URI is invalid').isURL().run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.throw();
    }

    const partner = req.partner
    const link = await bridgeService.createKycUrl(partner.id, `${Config.frontendUri}/kyc-success`)

    await KycLink.create({
      link,
      userId: partner.id
    })

    return res.status(200).json({ link });
  } catch (err) {
    log.warn({
      func: '/partners/orders',
      err
    }, 'Failed get tos link')

    if (err.mapped && err.mapped()) {
      return res.status(422).send({
        message: 'Failed validation',
        errors: err.mapped()
      })
    }

    res.status(400).send({
      message: err.message || 'Error'
    });
  }
})

export = router;
