const express = require('express');
const router = express.Router();
const { addAdminV } = require('./helpers/joiSchema');
//
const { adminCredMdl } = require('./helpers/schemaColl');
//
const bcrypt = require('bcrypt');
const saltRounds = 10;
//
router.post('/addAdmin', async (req, res, next) => {
  try {
    const body = await addAdminV.validateAsync(req.body);
    const hashedPswd = await bcrypt.hash(body.password, saltRounds);
    if (hashedPswd) {
      body.password = hashedPswd;
      const response = await adminCredMdl.create(body);
      if (response) res.send({ msg: 'Success' });
      else
        return next(
          createErr.InternalServerError(
            'This service is currently down.<br>Sorry for the inconvenience caused.<br>Please try again later.'
          )
        );
    } else {
      storeErr(req, 'Hash Password generate Failed: Add Admin');
      return next(
        createErr.ServiceUnavailable(
          'This service is currently down.<br>Sorry for the inconvenience caused.<br>Please try again later.'
        )
      );
    }
  } catch (error) {
    if (error.isJoi) error.status = 422;
    next(error);
  }
});
module.exports = router;
