// Joi Validation Schemas for Exam Portal Backend
// This file contains all Joi validation schemas used across the application.
// Schemas are grouped by functionality for better organization and maintainability.

const Joi = require('joi');

// ==========================================
// COMMON SCHEMAS (Reusable Components)
// ==========================================

/**
 * CSRF Token Schema
 * Validates the CSRF token for security purposes.
 */
const csrfTokenSchema = {
  _csrf: Joi.string().min(10).max(100).trim().messages({
    'string.empty': 'CSRF token is required for security.',
    'string.min': 'CSRF token must be at least 10 characters.',
    'string.max': 'CSRF token cannot exceed 100 characters.',
    'any.required': 'CSRF token is mandatory.',
  }),
};

const jwtTokenSchema = {
  token: Joi.string()
    .pattern(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
    .required()
    .label('JWT Token')
    .messages({
      'string.base': '"token" should be a type of string',
      'string.empty': '"token" cannot be empty',
      'string.pattern.base': '"token" must be a valid JWT',
      'any.required': '"token" is required',
    }),
};

/**
 * Username Schema (Required)
 * Validates username fields that are mandatory.
 */
const unamSchReq = {
  uname: Joi.string().min(3).max(60).trim().required().messages({
    'string.empty': 'Username is required.',
    'string.min': 'Username must be at least 3 characters long.',
    'string.max': 'Username cannot exceed 60 characters.',
    'any.required': 'Username is mandatory.',
  }),
};

/**
 * Email Schema
 * Validates email addresses with specific TLD restrictions.
 */
const emailSch = {
  email: Joi.string()
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
    }),
};

/**
 * OTP Schema
 * Validates one-time password (OTP) as an integer.
 */
const otpSch = {
  otp: Joi.number().integer().required().messages({
    'number.base': 'OTP must be a valid number.',
    'any.required': 'OTP is required.',
  }),
};

/**
 * Password Schema
 * Validates password with strong requirements: uppercase, lowercase, digit, special character.
 */
const pswdSch = {
  password: Joi.string()
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
    }),
};

/**
 * Passcode Schema
 * Validates test passcode as alphanumeric, uppercase, 9-10 characters.
 */
const passcodeSch = {
  passcode: Joi.string().alphanum().min(9).max(10).trim().uppercase().required().messages({
    'string.alphanum': 'Passcode must contain only letters and numbers.',
    'string.min': 'Passcode must be at least 9 characters long.',
    'string.max': 'Passcode cannot exceed 10 characters.',
    'string.uppercase': 'Passcode must be in uppercase.',
    'any.required': 'Passcode is required to identify the exam.',
  }),
};

// ==========================================
// AUTHENTICATION SCHEMAS
// ==========================================

/**
 * Email Validation Schema
 * For basic email validation.
 */
const emailV = Joi.object(emailSch);

const AuthValidation = {
  register: {
    sendOtpSchema: Joi.object({ ...emailSch }),
    verifyOtpSchema: Joi.object({ ...emailSch, ...otpSch }),
    complete: Joi.object({ ...pswdSch, ...jwtTokenSchema }),
  },
  reset: {
    sendOtpSchema: Joi.object({
      email: Joi.alternatives()
        .try(
          Joi.string()
            .min(3)
            .max(60)
            .lowercase()
            .trim()
            .email({ tlds: { allow: ['com', 'in', 'edu', 'net'] } }),
          Joi.string().min(3).max(60).trim(),
        )
        .required()
        .messages({
          'alternatives.match': 'Must be a valid email or username.',
          'string.empty': 'Email or username is required.',
          'string.min': 'Must be at least 3 characters long.',
          'string.max': 'Cannot exceed 60 characters.',
          'any.required': 'Email or username is mandatory.',
        }),
    }),
    verifyOtpSchema: Joi.object({
      email: Joi.alternatives()
        .try(
          Joi.string()
            .min(3)
            .max(60)
            .lowercase()
            .trim()
            .email({ tlds: { allow: ['com', 'in', 'edu', 'net'] } }),
          Joi.string().min(3).max(60).trim(),
        )
        .required()
        .messages({
          'alternatives.match': 'Must be a valid email or username.',
          'string.empty': 'Email or username is required.',
          'string.min': 'Must be at least 3 characters long.',
          'string.max': 'Cannot exceed 60 characters.',
          'any.required': 'Email or username is mandatory.',
        }),
      ...otpSch,
    }),
    complete: Joi.object({ ...pswdSch, ...jwtTokenSchema }),
  },
  signin: Joi.object({
    email: Joi.alternatives()
      .try(
        Joi.string()
          .min(3)
          .max(60)
          .lowercase()
          .trim()
          .email({ tlds: { allow: ['com', 'in', 'edu', 'net'] } }),
        Joi.string().min(3).max(60).trim(),
      )
      .required()
      .messages({
        'alternatives.match': 'Must be a valid email or username.',
        'string.empty': 'Email or username is required.',
        'string.min': 'Must be at least 3 characters long.',
        'string.max': 'Cannot exceed 60 characters.',
        'any.required': 'Email or username is mandatory.',
      }),
    ...pswdSch,
  }),
};

/**
 * Google Registration Validation Schema
 * For Google OAuth registration with email and Google ID.
 */
const registerGglV = Joi.object({
  ...emailSch,
  gId: Joi.string().alphanum().max(150).required().messages({
    'string.alphanum': 'Google ID must be alphanumeric.',
    'string.max': 'Google ID cannot exceed 150 characters.',
    'any.required': 'Google ID is required.',
  }),
});

/**
 * Profile Update Validation Schema
 * For updating user profile information.
 */
const profileV = Joi.object({
  uname: Joi.string().alphanum().min(6).max(15).trim().required().messages({
    'string.alphanum':
      'Username can only contain letters and numbers. No spaces or special characters allowed.',
    'string.min': 'Username must be at least 6 characters long.',
    'string.max': 'Username cannot exceed 15 characters.',
    'any.required': 'Username is required.',
  }),
  name: Joi.string().min(5).max(30).trim().required().messages({
    'string.min': 'Name must be at least 5 characters long.',
    'string.max': 'Name cannot exceed 30 characters.',
    'any.required': 'Name is required.',
  }),
  sendCand: Joi.boolean().required().messages({
    'any.required': 'Send candidate preference is required.',
  }),
  ...csrfTokenSchema,
});

// ==========================================
// ADMIN SCHEMAS
// ==========================================

/**
 * Admin Authentication Schema
 * For admin login.
 */
const adminAuth = Joi.object({
  ...unamSchReq,
  ...pswdSch,
  ...csrfTokenSchema,
});

/**
 * Question Bank Validation Schema
 * For creating/updating question banks for exams.
 */
const qBankJoi = Joi.object({
  passcode: Joi.string().alphanum().min(9).max(10).trim().required(),
  strtTime: Joi.date().iso().required().messages({
    'date.format': 'Start time must be in ISO date format.',
    'any.required': 'Start time is required.',
  }),
  endTime: Joi.date().iso().required().messages({
    'date.format': 'End time must be in ISO date format.',
    'any.required': 'End time is required.',
  }),
  open: Joi.boolean().required().messages({
    'any.required': 'Open status is required.',
  }),
  isFixedDur: Joi.boolean().required().messages({
    'any.required': 'Fixed duration flag is required.',
  }),
  dur: Joi.string().alphanum().max(10).trim().required().messages({
    'string.alphanum': 'Duration must be alphanumeric.',
    'string.max': 'Duration cannot exceed 10 characters.',
    'any.required': 'Duration is required.',
  }),
  testInfo: Joi.string().max(2000).trim().required().messages({
    'string.max': 'Test info cannot exceed 2000 characters.',
    'any.required': 'Test information is required.',
  }),
  qBank: Joi.string().max(25000).trim().required().messages({
    'string.max': 'Question bank data cannot exceed 25000 characters.',
    'any.required': 'Question bank is required.',
  }),
  crctOpt: Joi.string().max(1000).trim().required().messages({
    'string.max': 'Correct options cannot exceed 1000 characters.',
    'any.required': 'Correct options are required.',
  }),
  isUpdt: Joi.boolean().required().messages({
    'any.required': 'Update flag is required.',
  }),
  ...csrfTokenSchema,
});

/**
 * Passcode Validation Schema
 * For passcode-only validation with CSRF token.
 */
const passcodeV = Joi.object({ ...passcodeSch, ...csrfTokenSchema });

/**
 * Upload Results Validation Schema
 * For uploading exam results.
 */
const uploadResV = Joi.object({
  ...passcodeSch,
  mailList: Joi.string().max(60000).trim().required().messages({
    'string.max': 'Mail list cannot exceed 60000 characters.',
    'any.required': 'Mail list is required.',
  }),
  scrDet: Joi.string().max(30000).trim().required().messages({
    'string.max': 'Score details cannot exceed 30000 characters.',
    'any.required': 'Score details are required.',
  }),
  total: Joi.string().max(3000).trim().required().messages({
    'string.max': 'Total cannot exceed 3000 characters.',
    'any.required': 'Total is required.',
  }),
  negMark: Joi.string().max(2000).trim().required().messages({
    'string.max': 'Negative marking cannot exceed 2000 characters.',
    'any.required': 'Negative marking is required.',
  }),
  eMarks: Joi.string().max(10000).trim().required().messages({
    'string.max': 'Marks cannot exceed 10000 characters.',
    'any.required': 'Marks are required.',
  }),
  eCmnts: Joi.string().max(50000).trim().required().messages({
    'string.max': 'Comments cannot exceed 50000 characters.',
    'any.required': 'Comments are required.',
  }),
  finalScore: Joi.string().max(50000).trim().required().messages({
    'string.max': 'Final score cannot exceed 50000 characters.',
    'any.required': 'Final score is required.',
  }),
  ...csrfTokenSchema,
});

/**
 * Get Result String Validation Schema
 * For retrieving result strings.
 */
const getResultStrV = Joi.object({
  mailList: Joi.string().max(50000).trim().required().messages({
    'string.max': 'Mail list cannot exceed 50000 characters.',
    'any.required': 'Mail list is required.',
  }),
  ...csrfTokenSchema,
});

/**
 * Upload Rank Validation Schema
 * For uploading ranking data.
 */
const uploadRankV = Joi.object({
  ...passcodeSch,
  spms: Joi.string().max(100000).trim().required().messages({
    'string.max': 'Special marks cannot exceed 100000 characters.',
    'any.required': 'Special marks are required.',
  }),
  fsRank: Joi.string().max(100000).trim().required().messages({
    'string.max': 'Final rank cannot exceed 100000 characters.',
    'any.required': 'Final rank is required.',
  }),
  ...csrfTokenSchema,
});

/**
 * Excel Download Validation Schema
 * For downloading Excel files.
 */
const excelDnV = Joi.object({
  html: Joi.string().max(1000000).trim().required().messages({
    'string.max': 'HTML content cannot exceed 1000000 characters.',
    'any.required': 'HTML content is required.',
  }),
  ...csrfTokenSchema,
});

/**
 * Show Results Validation Schema
 * For displaying results.
 */
const showResV = Joi.object({
  mailList: Joi.string().max(100000).trim().required().messages({
    'string.max': 'Mail list cannot exceed 100000 characters.',
    'any.required': 'Mail list is required.',
  }),
  showResData: Joi.string().max(100000).trim().required().messages({
    'string.max': 'Result data cannot exceed 100000 characters.',
    'any.required': 'Result data is required.',
  }),
  ...csrfTokenSchema,
});

/**
 * Add Admin Validation Schema
 * For adding new admin users.
 */
const addAdminV = Joi.object({
  ...unamSchReq,
  ...emailSch,
  ...pswdSch,
  org: Joi.string().min(5).max(30).required().messages({
    'string.min': 'Organization name must be at least 5 characters.',
    'string.max': 'Organization name cannot exceed 30 characters.',
    'any.required': 'Organization is required.',
  }),
  img: Joi.string().min(10).max(60).required().messages({
    'string.min': 'Image URL must be at least 10 characters.',
    'string.max': 'Image URL cannot exceed 60 characters.',
    'any.required': 'Image is required.',
  }),
  imgUpKey: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Image upload key must be at least 3 characters.',
    'string.max': 'Image upload key cannot exceed 100 characters.',
    'any.required': 'Image upload key is required.',
  }),
  ...csrfTokenSchema,
});

// ==========================================
// INVITATION SCHEMAS
// ==========================================

/**
 * Invite Mail Validation Schema
 * For sending invitation emails.
 */
const inviteMailV = Joi.object({
  ...passcodeSch,
  from: Joi.string()
    .min(3)
    .max(60)
    .lowercase()
    .trim()
    .email({ tlds: { allow: ['com', 'in', 'edu', 'net', 'cf'] } })
    .messages({
      'string.email': 'Please provide a valid sender email address.',
      'string.min': 'Sender email must be at least 3 characters.',
      'string.max': 'Sender email cannot exceed 60 characters.',
    }),
  sender: Joi.string().max(50).trim().required().messages({
    'string.max': 'Sender name cannot exceed 50 characters.',
    'any.required': 'Sender name is required.',
  }),
  token: Joi.string().max(120).trim().allow(null, '').messages({
    'string.max': 'Token cannot exceed 120 characters.',
  }),
  mailBody: Joi.string().max(10000).trim().required().messages({
    'string.max': 'Mail body cannot exceed 10000 characters.',
    'any.required': 'Mail body is required.',
  }),
  mailSub: Joi.string().max(250).trim().required().messages({
    'string.max': 'Mail subject cannot exceed 250 characters.',
    'any.required': 'Mail subject is required.',
  }),
  myHold: Joi.string().max(50).trim().required().messages({
    'string.max': 'Hold cannot exceed 50 characters.',
    'any.required': 'Hold is required.',
  }),
  queue: Joi.string().max(50000).trim().required().messages({
    'string.max': 'Queue cannot exceed 50000 characters.',
    'any.required': 'Queue is required.',
  }),
  ...csrfTokenSchema,
});

/**
 * Invite Authentication Object
 * Base object for invitation authentication.
 */
const inviteAuthObj = {
  ...passcodeSch,
  myAuthHash: Joi.string().alphanum().min(3).max(30).trim().required().messages({
    'string.alphanum': 'Auth hash must be alphanumeric.',
    'string.min': 'Auth hash must be at least 3 characters.',
    'string.max': 'Auth hash cannot exceed 30 characters.',
    'any.required': 'Auth hash is required.',
  }),
  ...emailSch,
};

/**
 * Invite Authentication Validation Schema
 * For invitation authentication.
 */
const inviteAuthV = Joi.object(inviteAuthObj);

/**
 * Unsubscribe Object
 * Extends invite auth for unsubscribe functionality.
 */
const unSubObj = {
  ...inviteAuthObj,
  sender: Joi.string().min(3).max(60).trim().required().messages({
    'string.min': 'Sender must be at least 3 characters.',
    'string.max': 'Sender cannot exceed 60 characters.',
    'any.required': 'Sender is required.',
  }),
  type: Joi.string().max(5).trim().required().messages({
    'string.max': 'Type cannot exceed 5 characters.',
    'any.required': 'Type is required.',
  }),
};

/**
 * Invite Unsubscribe Validation Schema
 * For unsubscribing from invitations.
 */
const inviteUnSubV = Joi.object(unSubObj);

/**
 * Invitation Mail Acceptance Validation Schema
 * For accepting invitation mails.
 */
const invMailAcc = Joi.object({
  name: Joi.string().max(50).trim().required().messages({
    'string.max': 'Name cannot exceed 50 characters.',
    'any.required': 'Name is required.',
  }),
  ...emailSch,
  token: Joi.string().max(120).trim().required().messages({
    'string.max': 'Token cannot exceed 120 characters.',
    'any.required': 'Token is required.',
  }),
  ...csrfTokenSchema,
});

// ==========================================
// CANDIDATE SCHEMAS
// ==========================================

/**
 * Library Selection Validation Schema
 * For candidate library selection.
 */
const libSelV = Joi.object({
  ...passcodeSch,
  libSel: Joi.string().max(1500).trim().required().messages({
    'string.max': 'Library selection cannot exceed 1500 characters.',
    'any.required': 'Library selection is required.',
  }),
  ...csrfTokenSchema,
});

/**
 * Questionnaire Validation Schema
 * For candidate questionnaire responses.
 */
const qsnrV = Joi.object({
  ...passcodeSch,
  response: Joi.string().max(1500).trim().required().messages({
    'string.max': 'Response cannot exceed 1500 characters.',
    'any.required': 'Response is required.',
  }),
  ...csrfTokenSchema,
});

/**
 * Submit Test Validation Schema
 * For submitting test responses.
 */
const submitTestV = Joi.object({
  ...passcodeSch,
  crntSec: Joi.number().integer().required().messages({
    'number.base': 'Current section must be a number.',
    'any.required': 'Current section is required.',
  }),
  response: Joi.string().trim().required().messages({
    'any.required': 'Response is required.',
  }),
  status: Joi.string().trim().required().messages({
    'any.required': 'Status is required.',
  }),
  tcResponse: Joi.string().trim().required().messages({
    'any.required': 'TC response is required.',
  }),
  cdLangId: Joi.string().trim().required().messages({
    'any.required': 'Code language ID is required.',
  }),
  vData: Joi.string().trim().optional(),
  sSize: Joi.string().trim().optional(),
  ...csrfTokenSchema,
});

/**
 * Compiler Validation Schema
 * For code compilation requests.
 */
const compilerV = Joi.object({
  resource: Joi.string().max(10000).trim().required().messages({
    'string.max': 'Resource cannot exceed 10000 characters.',
    'any.required': 'Resource is required.',
  }),
  target: Joi.number().integer().required().messages({
    'number.base': 'Target must be a number.',
    'any.required': 'Target is required.',
  }),
  useflow: Joi.number().integer().required().messages({
    'number.base': 'Use flow must be a number.',
    'any.required': 'Use flow is required.',
  }),
  fordata: Joi.string().min(0).max(2000).trim().allow(null, '').messages({
    'string.max': 'Data cannot exceed 2000 characters.',
  }),
  ...csrfTokenSchema,
});

/**
 * Feedback Validation Schema
 * For candidate feedback submission.
 */
const feedbackV = Joi.object({
  ...passcodeSch,
  feedback: Joi.string().max(1000).trim().optional().messages({
    'string.max': 'Feedback cannot exceed 1000 characters.',
  }),
  ...csrfTokenSchema,
});

// ==========================================
// GENERAL SCHEMAS
// ==========================================

// ==========================================
// EMAIL SCHEMAS
// ==========================================

/**
 * Email Unsubscribe Validation Schema
 * For email unsubscribe requests.
 */
const emailUnSubV = Joi.object({
  ...emailSch,
  action: Joi.string().min(1).max(10).trim().required().messages({
    'string.min': 'Action must be at least 1 character.',
    'string.max': 'Action cannot exceed 10 characters.',
    'any.required': 'Action is required.',
  }),
  mailUID: Joi.string().min(20).max(50).trim().required().messages({
    'string.min': 'Mail UID must be at least 20 characters.',
    'string.max': 'Mail UID cannot exceed 50 characters.',
    'any.required': 'Mail UID is required.',
  }),
});

module.exports = {
  AuthValidation,
  registerGglV,
  profileV,
  adminAuth,
  qBankJoi,
  passcodeV,
  uploadResV,
  getResultStrV,
  uploadRankV,
  excelDnV,
  showResV,
  invMailAcc,
  inviteMailV,
  emailV,
  inviteAuthV,
  inviteUnSubV,
  //
  libSelV,
  qsnrV,
  submitTestV,
  compilerV,
  feedbackV,
  //
  addAdminV,
  //
  emailUnSubV,
};
