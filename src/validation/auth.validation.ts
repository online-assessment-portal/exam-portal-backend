import * as Joi from 'joi';

// Base schemas
const emailSchema = Joi.string()
  .min(3)
  .max(60)
  .lowercase()
  .trim()
  .email({ tlds: { allow: ['com', 'in', 'edu', 'net'] } })
  .required()
  .messages({
    'string.empty': 'Email address is required.',
    'string.email': 'Please provide a valid email address.',
    'string.min': 'Email must be at least 3 characters long.',
    'string.max': 'Email cannot exceed 60 characters.',
    'any.required': 'Email is mandatory.',
  });

export const usernameSchema = Joi.string().min(3).max(60).trim().required().messages({
  'string.empty': 'Username is required.',
  'string.min': 'Username must be at least 3 characters long.',
  'string.max': 'Username cannot exceed 60 characters.',
  'any.required': 'Username is mandatory.',
});

const passwordSchema = Joi.string()
  .min(6)
  .max(16)
  .trim()
  .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[\d])(?=.*[\W|_])[a-zA-Z0-9!@#$%^&*]{6,16}$/)
  .required()
  .messages({
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.',
    'string.min': 'Password must be at least 6 characters long.',
    'string.max': 'Password cannot exceed 16 characters.',
    'any.required': 'Password is required.',
  });

const otpSchema = Joi.number().integer().required().messages({
  'number.base': 'OTP must be a valid number.',
  'any.required': 'OTP is required.',
});

const jwtTokenSchema = Joi.string()
  .pattern(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid token format.',
    'any.required': 'Token is required.',
  });

const emailOrUsernameSchema = Joi.alternatives()
  .try(emailSchema, usernameSchema)
  .required()
  .messages({
    'alternatives.match': 'Must be a valid email or username.',
    'any.required': 'Email or username is mandatory.',
  });

// Auth validation schemas
export const AuthValidation = {
  register: {
    sendOtpSchema: Joi.object({
      email: emailSchema,
    }),

    verifyOtpSchema: Joi.object({
      email: emailSchema,
      otp: otpSchema,
    }),

    complete: Joi.object({
      password: passwordSchema,
      token: jwtTokenSchema,
    }),
  },

  reset: {
    sendOtpSchema: Joi.object({
      email: emailOrUsernameSchema,
    }),

    verifyOtpSchema: Joi.object({
      email: emailOrUsernameSchema,
      otp: otpSchema,
    }),

    complete: Joi.object({
      password: passwordSchema,
      token: jwtTokenSchema,
    }),
  },

  signin: Joi.object({
    email: emailOrUsernameSchema,
    password: passwordSchema,
  }),
};
