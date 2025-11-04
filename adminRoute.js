const express = require('express');
const router = express.Router();
//
const createErr = require('http-errors');
const { cookieObj, storeErr, isAdminLogged, clearAllCookies } = require('./helpers/common');
//
const bcrypt = require('bcrypt');
//
async function verifyPassword(pass, hash) {
  const result = await bcrypt.compare(pass, hash);
  if (result) return true;
  else return false;
}
//
const { adminCredMdl, qBankMdl } = require('./helpers/schemaColl');
//
const { adminAuth, qBankJoi, passcodeV } = require('./helpers/joiSchema');
//
const { signInLimiter, signInLimiterIP } = require('./helpers/rateLimiter');
//
async function loadTest(obj, uname) {
  // Load last 10 Test Uploaded
  const last10Test = await qBankMdl.find({ admin: uname }).limit(10).lean();
  if (last10Test) obj.last10Test = last10Test;
  else
    obj.notify +=
      "Welcome to Examination Portal.It seems this is going to be your First Test, in case you need help don't hesitate to contact.";
  return obj;
}
function processAdminSignIn(req, res, getAdmin) {
  return new Promise((resolve) => {
    clearAllCookies(req, res);
    req.session.regenerate(function (error) {
      if (error) storeErr(req, error);
      else {
        req.session.adminLogged = true;
        req.session.admEmail = getAdmin.email;
        res.cookie('uname', getAdmin.uname, cookieObj);
        res.cookie('org', getAdmin.org, cookieObj);
        res.cookie('img', getAdmin.img, cookieObj);
        res.cookie('key', getAdmin.imgUpKey, cookieObj);
        res.cookie('mailAcc', getAdmin.mailAcc, cookieObj);
      }
      resolve();
    });
  });
}
//
router.post('/authAdmin/', async (req, res, next) => {
  try {
    const checkSignIn = isAdminLogged(req, 1);
    if (checkSignIn) {
      await loadTest(checkSignIn, checkSignIn.adminUname);
      delete checkSignIn.adminUname;
      return res.send(checkSignIn);
    }
    //
    const result = await adminAuth.validateAsync(req.body);
    //
    const myIP = req.headers['x-forwarded-for'] || req.ip;
    const ipUnameKey = `${result.uname}_${myIP}`;
    // Get Failed attempts if any
    const [fails, failsIP] = await Promise.all([
      signInLimiter.get(result.uname),
      signInLimiterIP.get(ipUnameKey),
    ]);
    let retrySecs = 0;
    // Block each username per IP - small blocks
    if (failsIP !== null && failsIP.consumedPoints > 4) {
      retrySecs = Math.round(failsIP.msBeforeNext / 1000) || 1;
    }
    // Block username for all IPs Large Block
    else if (fails !== null && fails.consumedPoints > 99) {
      retrySecs = Math.round(fails.msBeforeNext / 1000) || 1;
    }
    if (retrySecs > 0)
      return next(
        createErr.TooManyRequests(
          `Crossed maximum attempts allowed<br>Retry-after ${retrySecs}secs`,
        ),
      );
    const consumeBoth = async () => {
      // Consume one Failed Attempt for both
      await Promise.all([signInLimiter.consume(result.uname), signInLimiterIP.consume(ipUnameKey)]);
    };
    //
    const getAdmin = await adminCredMdl
      .findOne({ $or: [{ uname: result.uname }, { email: result.uname }] })
      .lean();
    if (getAdmin) {
      const status = await verifyPassword(result.password, getAdmin.password);
      if (status === true) {
        // Delete Failure Couting for unameIP only
        if (failsIP !== null && failsIP.consumedPoints > 0) {
          // Reset on successful authorisation
          await signInLimiterIP.delete(ipUnameKey);
        }
        const obj = {
          loggedIn: true,
          org: getAdmin.org,
          img: getAdmin.img,
          imgUpKey: getAdmin.imgUpKey,
          mailAcc: getAdmin.mailAcc,
        };
        //
        const promise1 = processAdminSignIn(req, res, getAdmin);
        const promise2 = loadTest(obj, getAdmin.uname);
        Promise.all([promise1, promise2]).then(() => {
          res.send(obj);
        });
      } else {
        await consumeBoth();
        storeErr(req, `Admin Invalid Password ${result.uname}`);
        next(
          createErr.Unauthorized(
            `Invalid Username/Password.<br>${
              failsIP ? failsIP.remainingPoints - 1 : 4
            } attempts left`,
          ),
        );
      }
    } else {
      // Consume one Failed Attempt - if user doesn't exists consume for uname only not uname_IP
      await consumeBoth();
      next(
        createErr.Unauthorized(
          `Invalid Username/Password.<br>${
            failsIP ? failsIP.remainingPoints - 1 : 4
          } attempts left`,
        ),
      );
    }
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    // Some Redis other Error
    next(error);
  }
});
//
router.post('/upload_testData/', async (req, res, next) => {
  try {
    const uname = isAdminLogged(req, 2);
    if (uname === false)
      return next(
        createErr.Unauthorized('Admin not Logged In.<br>Please refresh this Page and Login'),
      );
    //
    const body = await qBankJoi.validateAsync(req.body);
    body.admin = uname;
    //
    if (body.isUpdt) {
      const result = await qBankMdl.updateOne({ passcode: body.passcode }, body);
      if (result && result.ok) {
        let msg =
          'Test was Updated Successfully.<br>We recommend reviewing before conducting this Test.';
        if (result.nModified === 0) msg += '<br>No new modifications.';
        res.send({ msg });
      } else
        next(
          createErr.InternalServerError(
            "Something went wrong.<br>If the issue persists don't hesitate to contact us.",
          ),
        );
    } else {
      const response = await qBankMdl.create(body);
      if (response) {
        const msg =
          'Test was Prepared Successfully.<br>We recommend reviewing before conducting this Test.';
        res.send({ msg });
      } else
        next(
          createErr.InternalServerError(
            "Something went wrong.<br>If the issue persists don't hesitate to contact us.",
          ),
        );
    }
  } catch (error) {
    if (error.name === 'MongoError') {
      if (error.code === 11000) {
        if (
          error.message.search('duplicate key error') !== 1 &&
          error.message.search('passcode_1 dup key') !== -1
        ) {
          return next(
            createErr(
              'Oops! This Passcode is already being used by some other Test.<br>Please generate another one and Retry.',
            ),
          );
        }
      }
    } else if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
//
router.post('/loadTestData/', async (req, res, next) => {
  try {
    const uname = isAdminLogged(req, 2);
    if (uname === false)
      return next(
        createErr.Unauthorized('Admin not Logged In.<br>Please refresh this Page and Login'),
      );
    const body = await passcodeV.validateAsync(req.body);
    const response = await qBankMdl.findOne({ passcode: body.passcode }).lean();
    if (response) {
      if (response.admin !== uname)
        return next(
          createErr.Unauthorized(
            "You don't have sufficient Rights to access Test of some other Organization.",
          ),
        );
      else {
        delete response._id;
        delete response.__v;
        res.send(response);
      }
    } else next(createErr.NotFound("Invalid Passcode.<br>Test with this Passcode doesn't exists."));
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
module.exports = router;
