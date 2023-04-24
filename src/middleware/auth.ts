import passport from 'passport';
import { RequestHandler } from 'express';
import { User } from '../models/User';

declare global {
  namespace Express {
    interface User {
      id?: string;
      firstName?: string;
      lastName?: string;
      email: string;
      phoneNumber
    }
    interface Request {
      user?: User
    }
  }
}

// TODO: This middleware doesn't force user to be authenticated, This can be used for POST /callers
export const parseAuthHeader: RequestHandler = async (req, res, next) => {
  passport.authenticate('bearer-validate', { session: false }, (err, data, info) => {
    if (data && data.user) {
      req.user = trimUser(data.user);
    }

    return next(err);
  })(req, res, next);
};

export const authenticate: RequestHandler = async (req, res, next) => {
  passport.authenticate('bearer-validate', { session: false }, (err, data, info) => {
    if (data && data.user) {
      req.user = trimUser(data.user);
    } else {
      return res.error('User not authenticated', 401);
    }

    return next(err);
  })(req, res, next);
};

export const authMiddlewareForGraphql: RequestHandler = async (req, res, next) => {
  passport.authenticate('bearer-validate', { session: false }, (err, data, info) => {
    if (data && data.user) {
      req.user = trimUser(data.user);
    }

    return next(err);
  })(req, res, next);
};

const trimUser = (user: User) => {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber
  };
};
