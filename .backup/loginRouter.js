const express = require('express');
const router = express.Router();
//
const createErr = require('http-errors');
const { cookieObj, storeErr, processSignIn, isUserLogged } = require('../helpers/common');
//
const bcrypt = require('bcrypt');
const saltRounds = 10;
//
async function verifyPassword(pass, hash) {
  const result = await bcrypt.compare(pass, hash);
  if (result) return true;
  else return false;
}
//
const { otpEmailV, otpV, signInV, registerAccV, profileV } = require('../helpers/joiSchema');
//
const { credentialsMdl } = require('../helpers/schemaColl');
//
const mailer = require('../mailer');
//
//
const {
  signInLimiter,
  signInLimiterIP,
  otpMailLimiter,
  otpVerifyLimiter,
} = require('./helpers/rateLimiter');
//
router.post('/signIn/', async (req, res, next) => {
  try {
    const userInfo = isUserLogged(req, 1);
    if (userInfo) {
      const obj = {
        status: 200,
        userInfo: userInfo,
      };
      res.send(obj);
      return true;
    }
    const result = await signInV.validateAsync(req.body);
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
    if (retrySecs > 0) {
      const show = Math.ceil(retrySecs / 60);
      return next(
        createErr.TooManyRequests(
          'Crossed maximum allowed attempts.<br>Retry-after ' +
            (show > 1 ? show + ' mins' : retrySecs + ' secs'),
        ),
      );
    }
    //
    const findRes = await credentialsMdl.findOne({
      $or: [{ uname: result.uname }, { email: result.uname }],
    });
    if (findRes) {
      const status = await verifyPassword(result.password, findRes.password);
      if (status === 'err') {
        storeErr(req, `Password Verification Failed: ${findRes.email}`);
        return next(
          createErr.InternalServerError(
            'Something went wrong: Error encountered.<br>Sorry for the inconvienience caused.',
          ),
        );
      } else if (status === true) {
        // Delete Failure Couting for unameIP only
        if (failsIP !== null && failsIP.consumedPoints > 0) {
          // Reset on successful authorisation
          await signInLimiterIP.delete(ipUnameKey);
        }
        //
        // const token = await signAccessToken(findRes.uname);
        processSignIn(req, res, findRes.email, findRes.uname, findRes.name, findRes.img).then(
          userInfo => {
            const obj = {
              status: 200,
              userInfo: userInfo,
            };
            res.send(obj);
          },
        );
      } else {
        // Consume one Failed Attempt for both
        await Promise.all([
          signInLimiter.consume(result.uname),
          signInLimiterIP.consume(ipUnameKey),
        ]);
        //
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
      await signInLimiter.consume(result.uname);
      return next(
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
    next(error);
  }
});
//
router.post('/otp_auth/', async (req, res, next) => {
  const body = req.body;
  try {
    let retrySecs = 0;
    const myIP = req.headers['x-forwarded-for'] || req.ip;
    if (body.otp) {
      // Block OTP Verification for 15mins
      const failsV = await otpVerifyLimiter.get(myIP);
      if (failsV !== null && failsV.consumedPoints > 4)
        retrySecs = Math.round(failsV.msBeforeNext / 1000) || 1;
    } else {
      // Block OTP Mailer for 15mins
      const failsM = await otpMailLimiter.get(myIP);
      if (failsM !== null && failsM.consumedPoints > 4)
        retrySecs = Math.round(failsM.msBeforeNext / 1000) || 1;
    }
    // Block each username per IP - small blocks
    if (retrySecs > 0) {
      const show = Math.ceil(retrySecs / 60);
      console.log(retrySecs);
      return next(
        createErr.TooManyRequests(
          'Crossed maximum allowed attempts.<br>Retry-after ' +
            (show > 1 ? show + ' mins' : retrySecs + ' secs'),
        ),
      );
    }
    //
    if (body.otp) {
      if (!req.session.otp)
        return next(
          createErr.BadRequest(
            'Duplicate Request / Request Expired.<br>Refresh this Page and retry.',
          ),
        );
      // update number of verification attempts
      await otpVerifyLimiter.consume(myIP);
      //
      const result = await otpV.validateAsync(body);
      //
      if (result.otp === req.session.otp) {
        const obj = { ovs: 'V' };
        if (result.email !== req.session.sentTo) obj.vioVerify = true;
        // ovs- OTP Verification Status
        delete req.session.otp;
        req.session.otpVerify = true;
        // Reset on successful authorisation
        await Promise.all([otpVerifyLimiter.delete(myIP), otpMailLimiter.delete(myIP)]);
        //
        res.send(obj);
      } else {
        storeErr(
          req,
          `OTP Mismatch: was ${req.session.otp} entered ${result.otp} for ${
            result.isReset ? 'Reset' : 'SignUp'
          }`,
        );
        return next(createErr.Conflict('OTP Mismatch - Verification Failed.'));
      }
    } else {
      // update number of mail requests
      await otpMailLimiter.consume(myIP);
      const result = await otpEmailV.validateAsync(body);
      // Find if account exists with this email
      const check = await credentialsMdl.findOne({ email: result.email });
      if (check) {
        // Account Exists
        // in case of signup make error saying account already exists
        if (!result.isReset)
          return next(
            createErr.Conflict('Account already exists for this e-Mail.<br>Please SignIn.'),
          );
      } else if (result.isReset) {
        // Account doesn't exists
        // in case of reset error out saying no account exists
        return next(
          createErr.Conflict(
            'No Account exists for this e-Mail/username.<br>Please Create an Account.',
          ),
        );
      }
      const otp = Math.floor(100000 + Math.random() * 900000);
      const status = await mailer.mailCreate(result.email, otp);
      if (status === true) {
        req.session.otp = otp;
        req.session.sentTo = result.email;
        //
        const obj = { sentTo: result.email };
        res.send(obj);
      } else if (status) return next(createErr.ServiceUnavailable(status));
      else {
        storeErr(req, `OTP Email sending Failed: ${result.email}`);
        return next(createErr.ServiceUnavailable('OTP Mail Sending Failed'));
      }
    }
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
//
router.post('/register_Acc/', async (req, res, next) => {
  const body = req.body;
  if (!req.session.sentTo) {
    storeErr(req, `Duplicate Request ${body.isReset ? 'Reset' : 'SignUp'}`);
    return next(
      createErr.BadRequest('Duplicate Request / Request Expired.<br>Refresh this Page and retry.'),
    );
  }
  if (!req.session.otpVerify) {
    storeErr(req, `Trying to ${body.isReset ? 'Reset' : 'SignUp'} without Verification`);
    return next(
      createErr.BadRequest('Duplicate Request / Request Expired.<br>Refresh this Page and retry.'),
    );
  }
  try {
    const result = await registerAccV.validateAsync(body);
    const hashedPswd = await bcrypt.hash(result.password, saltRounds);
    if (hashedPswd) {
      const email = req.session.sentTo;
      if (result.isReset) {
        const response = await credentialsMdl.findOneAndUpdate(
          { email: email },
          { password: hashedPswd },
        );
        if (response) {
          if (req.session.otpVerify) delete req.session.otpVerify;
          else storeErr(req, 'Password reset without Verification');
          // const token = await signAccessToken(response.uname);
          delete req.session.sentTo;
          const obj = { status: 200 };
          processSignIn(req, res, response.email, response.uname, response.name, response.img).then(
            userInfo => {
              obj.userInfo = userInfo;
              res.send(obj);
            },
          );
        } else
          return next(
            createErr.InternalServerError(
              'This service is currently down.<br>Sorry for the inconvenience caused.<br>Please try again later.',
            ),
          );
      } else {
        const accData = {
          email: email,
          uname: email,
          password: hashedPswd,
        };
        const response = await credentialsMdl.create(accData);
        if (response) {
          if (req.session.otpVerify) delete req.session.otpVerify;
          else storeErr(req, `Account Created without Verification: ${email}`);
          delete req.session.sentTo;
          const obj = { status: 200 };
          processSignIn(req, res, response.email, '', '', '').then(userInfo => {
            obj.userInfo = userInfo;
            res.send(obj);
          });
        } else
          return next(
            createErr.InternalServerError(
              'This service is currently down.<br>Sorry for the inconvenience caused.<br>Please try again later.',
            ),
          );
      }
    } else {
      storeErr(req, `${result.isReset ? 'Reset' : 'SignUp'} Error: Hash Password generate Failed.`);
      return next(
        createErr.ServiceUnavailable(
          'This service is currently down.<br>Sorry for the inconvenience caused.<br>Please try again later.',
        ),
      );
    }
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
router.post('/updateProfile/', async (req, res, next) => {
  try {
    const email = isUserLogged(req, 3);
    if (!email) {
      return next(createErr.Unauthorized('User not logged in.<br>Please Login.'));
    }
    const result = await profileV.validateAsync(req.body);
    const status = await credentialsMdl.updateOne({ email: email }, result).lean();
    //
    if (status && status.ok) {
      res.cookie('uname', result.uname, cookieObj);
      res.cookie('name', result.name, cookieObj);
      const obj = { status: 200 };
      if (result.sendCand)
        obj.userInfo = {
          email: email,
          uname: result.uname,
          name: result.name,
        };
      let notify = 'Updated';
      if (status.nModified === 0) notify += '<br>No new modifications.';
      obj.notify = notify;
      res.send(obj);
    } else
      return next(createErr.ServiceUnavailable('Something went wrong...<br>Retry after sometime.'));
  } catch (error) {
    if (
      error.code === 11000 &&
      error.keyPattern &&
      error.keyPattern.uname &&
      error.keyValue &&
      error.keyValue.uname
    )
      return next(
        createErr.UnavailableForLegalReasons(
          'this username is already occupied by someone else.<br>Look for something more unique.',
        ),
      );
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
//
module.exports = router;
