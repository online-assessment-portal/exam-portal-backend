const express = require('express');
const router = express.Router();
//
const createErr = require('http-errors');
//
const { storeErr, isAdminLogged } = require('./helpers/common');
//
const { contactV, passcodeV } = require('./helpers/joiSchema');
//
const {
  qBankMdl,
  responsesMdl,
  joinModel,
  contactMdl,
} = require('./helpers/schemaColl');
// ADMIN MONITORING
function getAllCand(passcode) {
  return new Promise((res, rej) => {
    responsesMdl
      .find({ passcode: passcode }, 'email entryCtr', (err, response) => {
        if (err) {
          storeErr('examAdmin', err);
          rej(err);
        } else if (response && response.length) {
          res(response);
        } else res(0);
      })
      .lean();
  });
}
// get all live candidates
function getLiveCand(passcode) {
  return new Promise((res, rej) => {
    joinModel
      .find({ passcode: passcode }, (err, response) => {
        if (err) {
          storeErr('examAdmin', err);
          rej(err);
        } else if (response && response.length) {
          res(response);
        } else res(0);
      })
      .lean();
  });
}
router.post('/contact', async (req, res, next) => {
  try {
    const body = await contactV.validateAsync(req.body);
    contactMdl.create(body, (err, response) => {
      if (err || !response) {
        if (err) storeErr(req, err);
        return next(
          createErr.InternalServerError(
            'Something went wrong: Sorry for the inconvenience caused.<br>Please drop a message on our WhatsApp 8529493017.'
          )
        );
      } else if (response)
        res.send({
          msg: 'Success',
        });
    });
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
//
router.post('/enquire/', async (req, res, next) => {
  try {
    const uname = isAdminLogged(req, 2);
    if (uname === false)
      return next(
        createErr.Unauthorized(
          'Admin not Logged In.<br>Please refresh this Page and Login'
        )
      );
    const body = await passcodeV.validateAsync(req.body);
    // Get test
    const promise1 = new Promise((resolve, reject) => {
      qBankMdl
        .findOne({ passcode: body.passcode }, 'testInfo admin', (err, test) => {
          if (err)
            createErr.InternalServerError(
              'Something went wrong: Error encountered.'
            );
          else if (test) {
            if (test.admin !== uname) {
              reject(-1);
              return false;
            }
            delete test.admin;
            test.passcode = body.passcode;
            return resolve(test);
          } else
            createErr.NotFound(
              'No Test/Event Exists with Passcode ' + body.passcode
            );
          resolve();
        })
        .lean();
    });
    // Get all registered candidates
    const promise2 = getAllCand(body.passcode);
    // Get all Live Candidates
    const promise3 = getLiveCand(body.passcode);
    // Send Response to Admin
    Promise.all([promise1, promise2, promise3])
      .then((response) => {
        const obj = {
          testData: response[0],
          allCand: response[1],
          liveCand: response[2],
        };
        res.send(obj);
      })
      .catch((err) => {
        storeErr('examAdmin', err);
        if (err === -1)
          next(
            createErr.Unauthorized(
              "You can't access Test/Event of some other organization"
            )
          );
        else
          next(
            createErr.InternalServerError(
              'Something went wrong: Error encountered.'
            )
          );
      });
  } catch (error) {
    if (error.isJoi) error.status = 422;
    next(error);
  }
});
module.exports = router;
