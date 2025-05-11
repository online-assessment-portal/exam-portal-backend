const express = require('express');
const router = express.Router();
//
const { storeErr, processSignIn, isUserLogged } = require('./helpers/common');
//
const directSignUp = require('./directSignUp');
//
const { credentialsMdl } = require('./helpers/schemaColl');
//
const { google } = require('googleapis');
// const people = google.people("v1");

const appEnv = process.env.NODE_ENV;
const isDev = appEnv === 'DEV';
const frontendDevURL = process.env.FRONTEND_DEV_URL;

const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID_SIGN_IN,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET_SIGN_IN,
  redirect: process.env.GOOGLE_CLIENT_REDIRECT_URI_SIGN_IN,
};
const oauth2Client = new google.auth.OAuth2(
  googleConfig.clientId,
  googleConfig.clientSecret,
  googleConfig.redirect
);
google.options({ auth: oauth2Client });
// This scope tells google what information we want to request.
// const defaultScope = ['openid', 'profile', 'email'];
// console.log({
//   authUrlGoogleSignIn: oauth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: defaultScope,
//   }),
// });
//  Extract the email and id of the google account from the "code" parameter.
async function getGoogleAccountFromCode(code) {
  // get the auth "tokens" from the request
  const data = await oauth2Client.getToken(code);
  const tokens = data.tokens;
  // add the tokens to the google api so we have access to the account
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: 'v2',
  });
  const userInfo = await oauth2.userinfo.get();

  return userInfo.data;
  // const res = await people.people.get({
  //   resourceName: "people/me",
  //   personFields: "emailAddresses",
  // });
  // return res.data;
}
//
router.get('/google-login', async (req, res) => {
  try {
    if (isUserLogged(req))
      return res.send(
        '<center><h1 style="color: orangered;font-family: monospace;">You were loggedIn previously.<br>Please proceed legally.</h1></center>'
      );
    const query = req.query;
    const googleUserData = await getGoogleAccountFromCode(query.code);
    //
    if (!googleUserData.email) {
      res.send(
        '<center><h1 style="color: orangered;font-family: monospace;">Google didn\'t authenticate your account with your email address or it was denied by you.<br>Email address must be sent to us to process SignIn/SignUp.</h1></center>'
      );
      return false;
    }

    const resp = await credentialsMdl.findOne({ email: googleUserData.email });
    if (resp) {
      // Google Account Exists
      processSignIn(req, res, resp.email, resp.uname, resp.name, resp.img, 2);
      res.redirect((isDev ? frontendDevURL : '') + '/test');
      return false;
    } else {
      // Google Account - SignUp
      directSignUp(
        req,
        googleUserData.email,
        googleUserData.name,
        googleUserData.id,
        'Google SignUp'
      )
        .then(() => {
          processSignIn(
            req,
            res,
            googleUserData.email,
            '',
            googleUserData.name,
            '',
            2
          );
          res.redirect((isDev ? frontendDevURL : '') + '/test?&ds=true');
          return false;
        })
        .catch((err) => {
          storeErr(req, err);
          res.send(
            '<center><h1 style="color: orangered;font-family: monospace;">Account Verification Failed.</h1></center>'
          );
        });
    }
  } catch (error) {
    storeErr(req, error);
    res.send(
      '<center><h1 style="color: orangered;font-family: monospace;">Bad Request detected.<br>Account Verification Failed.</h1></center>'
    );
  }
});
//
module.exports = router;
