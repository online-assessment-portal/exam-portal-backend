import Joi from 'joi';
import { usernameSchema } from './auth.validation';

export const ProfileValidation = {
  update: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    uname: usernameSchema.optional(),
    img: Joi.string().uri().optional(),
  }).min(1),
};
