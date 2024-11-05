const express = require("express");
const router = express.Router();
//
const { storeErr, processSignIn, isUserLogged } = require("./helpers/common");
//
const directSignUp = require("./directSignUp");
//
const { credentialsMdl } = require("./helpers/schemaColl");
//
const { google } = require("googleapis");
const people = google.people("v1");
//
const googleConfig = {
  clientId: process.env.gClientId,
  clientSecret: process.env.gClientSecret,
  redirect: process.env.gRedirect,
};
const oauth2Client = new google.auth.OAuth2(
  googleConfig.clientId,
  googleConfig.clientSecret,
  googleConfig.redirect,
);
google.options({ auth: oauth2Client });
// This scope tells google what information we want to request.
// const defaultScope = [
// 	"https://www.googleapis.com/auth/userinfo.email",
// 	"profile",
// ];
// Get a url which will open the google sign-in page and request access to the scope provided
// function getConnectionUrl(auth) {
// 	return auth.generateAuthUrl({
// 		access_type: "offline",
// 		scope: defaultScope,
// 	});
// }
// console.log(getConnectionUrl(oauth2Client));
//  Extract the email and id of the google account from the "code" parameter.
async function getGoogleAccountFromCode(code) {
  // get the auth "tokens" from the request
  const data = await oauth2Client.getToken(code);
  const tokens = data.tokens;
  // add the tokens to the google api so we have access to the account
  oauth2Client.setCredentials(tokens);
  //
  const res = await people.people.get({
    resourceName: "people/me",
    personFields: "emailAddresses",
  });
  return res.data;
}
//
router.get("/google-login", async (req, res) => {
  try {
    if (isUserLogged(req))
      return res.send(
        '<center><h1 style="color: orangered;font-family: monospace;">You were loggedIn previously.<br>Please proceed legally.</h1></center>',
      );
    const query = req.query;
    let obj = await getGoogleAccountFromCode(query.code);
    //
    if (
      !(
        obj.emailAddresses &&
        obj.emailAddresses[0] &&
        obj.emailAddresses[0].value
      )
    ) {
      res.send(
        '<center><h1 style="color: orangered;font-family: monospace;">Google didn\'t authenticate your account with your email address or it was denied by you.<br>Email address must be sent to us to process SignIn/SignUp.</h1></center>',
      );
      return false;
    }
    //
    obj = {
      googleId: obj.resourceName.split("/")[1],
      email: obj.emailAddresses[0].value,
    };
    const resp = await credentialsMdl.findOne({ email: obj.email });
    if (resp) {
      // Google Account Exists
      processSignIn(req, res, resp.email, resp.uname, resp.name, resp.img, 2);
      res.redirect("/test");
      return false;
    } else {
      // Google Account - SignUp
      directSignUp(req, obj.email, obj.googleId, "Google SignUp")
        .then(() => {
          processSignIn(req, res, obj.email, "", "", 2);
          res.redirect("/test?&ds=true");
          return false;
        })
        .catch((err) => {
          storeErr(req, err);
          res.send(
            '<center><h1 style="color: orangered;font-family: monospace;">Account Verification Failed.</h1></center>',
          );
        });
    }
  } catch (error) {
    storeErr(req, error);
    res.send(
      '<center><h1 style="color: orangered;font-family: monospace;">Bad Request detected.<br>Account Verification Failed.</h1></center>',
    );
  }
});
//
module.exports = router;
