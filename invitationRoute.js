const express = require("express");
const invRouter = express.Router();
//
const createErr = require("http-errors");
const {
  isAdminLogged,
  isUserLogged,
  storeErr,
  processSignIn,
} = require("./helpers/common");
//
const {
  passcodeV,
  emailV,
  invMailAcc,
  inviteMailV,
  inviteAuthV,
  inviteUnSubV,
} = require("./helpers/joiSchema");
//
const {
  invitationMdl,
  invUnSubMdl,
  credentialsMdl,
} = require("./helpers/schemaColl");
//
const directSignUp = require("./directSignUp");
//
//
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function randomString(length) {
  const result = [];
  for (let i = 0; i < length; i++)
    result.push(chars.charAt(Math.floor(Math.random() * 62)));
  return result.join("");
}
//
const { awsTransporter } = require("./aws_sesMailer");
//
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
//
const CLIENT_ID = process.env.INV_CLIENT_ID,
  CLIENT_SECRET = process.env.INV_CLIENT_SECRET,
  REDIRECT_URI = process.env.INV_REDIRECT_URI;
//
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
// const SCOPES = [
//   // "https://www.googleapis.com/auth/gmail.send",
//   "https://mail.google.com",
// ];
// const authUrl = oAuth2Client.generateAuthUrl({
//   access_type: "offline",
//   scope: SCOPES,
// });
// console.log({ authUrl });
invRouter.get("/setupMailer/", async (req, res, next) => {
  try {
    const code = req.query.code;
    if (!code) return next(createErr.BadRequest("Invalid Request Received"));
    const { tokens } = await oAuth2Client.getToken(code);
    if (!tokens.refresh_token)
      return createErr.BadRequest(
        "Mailer Account already exists for this Mail-Id."
      );
    const secure = req.csrfToken();
    const sendForm = `<style> form, input { font-size: large; font-family: "Roboto", sans-serif; } input { min-width: 40%; } button { font-size: large; } </style> <form action="/invite/setupAccount" method="post" style="font-size: x-large;"> <label for="name">Sender's Name</label> <input type="text" name="name" id="name" placeholder="Will be displayed in eMail" required> <br><br> <label for="mail">Email Address</label> <input type="email" name="email" id="mail" placeholder="Same as used for account creation" required> <input type="hidden" name="token" value="${tokens.refresh_token}"> <input type="hidden" name="_csrf" value="${secure}"><br> <br> <ul> <li>Please Note these settings are irreversible.</li> <li>Verify before submit</li> <li>Details are case-sensitive</li> <li>If the details do not match, mail will fail to deliver.</li> </ul> <button type="submit">Final Submit</button> </form>`;
    res.send(sendForm);
  } catch (error) {
    storeErr(req, error);
    next(error);
  }
});
//
const { adminCredMdl } = require("./helpers/schemaColl");
//
invRouter.post("/setupAccount", async (req, res, next) => {
  try {
    const uname = isAdminLogged(req, 2);
    if (uname === false)
      return next(
        createErr.Unauthorized("Admin not Logged In.<br>Please Login.")
      );
    const body = await invMailAcc.validateAsync(req.body);
    //
    const account = await adminCredMdl.findOne({ uname: uname }, "mailAcc");
    //
    let mailAccS = account.mailAcc;
    if (!mailAccS) mailAccS = {};
    else mailAccS = JSON.parse(mailAccS);
    mailAccS[body.email] = { name: body.name, token: body.token };
    //
    mailAccS = JSON.stringify(mailAccS);
    const status = await adminCredMdl.updateOne(
      { _id: account._id },
      { mailAcc: mailAccS }
    );
    if (status.ok && status.nModified)
      return res.send(
        'Account Created<br><br><a href="/testAdmin">Go to AdminPanel</a> logout and re-login to view updated Account.'
      );
    res.send("Something went wrong");
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
async function prepareMail(transporter, mailBody, reqBody, to, uniqueId) {
  const link = `https://shredtest.coderadiant.com/invite/myAuth?passcode=${reqBody.passcode}&myAuthHash=${uniqueId}&email=${to}`;
  mailBody = mailBody.replace(/\(\(=CandidateEmail=\)\)/g, to);
  mailBody = mailBody.replace(/\(\(=CandidateLink=\)\)/g, link);
  // gm - Gmail , ms - AWS SES
  const mailServer = reqBody.token ? "gm" : "ms";
  const unsubLink = `https://shredtest.coderadiant.com/invite/unsub?passcode=${reqBody.passcode}&myAuthHash=${uniqueId}&email=${to}&sender=${reqBody.from}&type=${mailServer}`;
  mailBody = mailBody.replace(/\(\(=UnsubLink=\)\)/g, unsubLink);
  //
  const mailObject = {
    from: `"${reqBody.sender}" <${reqBody.from}>`,
    to: to,
    subject: reqBody.mailSub,
    html: mailBody,
    text:
      "To view complete mail: Open it in supported browser.Your Exam-Link is" +
      link,
    list: {
      unsubscribe: {
        url: unsubLink,
        comment: "unsublinking",
      },
    },
  };
  if (mailServer === "ms")
    mailObject.replyTo = "contact@shredtest.coderadiant.com";
  //
  const retObj = {
    email: to,
    for: reqBody.passcode,
    token: uniqueId,
    status: 0,
    server: mailServer,
  };
  // send mail with defined transport object
  try {
    const info = await transporter.sendMail(mailObject);
    if (info.accepted.length) retObj.status = 1;
    return retObj;
  } catch (err) {
    storeErr(
      `Mail Error - ${mailServer} - ${err.code} - ${JSON.stringify(
        mailObject
      )}`,
      err
    );
    // 2 - Server Error/No Internet Server, 3 - Invalid Recepient, 4 - Auth Failed
    if (err.code === "EENVELOPE") retObj.status = 3;
    else if (err.code === "EAUTH") retObj.status = 4;
    else retObj.status = 2;
    return retObj;
  }
}
//
function delay2Sec() {
  return new Promise((res) => {
    setTimeout(() => {
      res();
    }, 2000);
  });
}
async function initSend(
  transporter,
  mailBody,
  reqBody,
  sendTo,
  outboxList,
  tokenList
) {
  // Filter email
  try {
    sendTo = await emailV.validateAsync({ email: sendTo });
    sendTo = sendTo.email;
  } catch (error) {
    storeErr("", `Invalid mail for invitation : ${sendTo}`);
    io.to(reqBody.myHold).emit("write", {
      show: "Invalid email detected: ",
      status: [sendTo, 3],
    });
    io.to(reqBody.myHold).emit("notify", {
      type: "e",
      msg: "Invalid Email Detected: See mail queue writer.<br>Rest - In progress",
    });
  }
  //
  let uniqueId;
  const found = outboxList.indexOf(sendTo);
  if (found >= 0) {
    uniqueId = tokenList[found];
    outboxList.splice(found, 1);
    tokenList.splice(found, 1);
  } else uniqueId = randomString(30);
  // Return status
  return prepareMail(transporter, mailBody, reqBody, sendTo, uniqueId)
    .then((obj) => {
      if (obj.status === 1 && found === -1) {
        invitationMdl.create(obj, (err, res) => {
          if (err || !res) {
            storeErr("", `Invite Store in DB Failed: ${JSON.stringify(obj)}`);
            io.to(reqBody.myHold).emit("write", {
              show: "Something went wrong for: ",
              status: [obj.email, 2],
            });
            io.to(reqBody.myHold).emit("notify", {
              type: "e",
              msg: "Technical Issues Detected: See mail queue writer.<br>Rest - In progress",
            });
            // Terminate process show status
            obj.status = 2;
          }
        });
      }
      return [obj.email, obj.status];
    })
    .catch((err) => {
      storeErr("Mail Error", err);
      io.to(reqBody.myHold).emit("notify", {
        type: "e",
        msg: "Mailing Complete : an Issue terminated the process in mid.",
      });
      io.to(reqBody.myHold).emit("cancelRest");
    });
}
async function initiateMail(
  transporter,
  mailBody,
  queue,
  reqBody,
  outboxList,
  tokenList,
  mailPerInit
) {
  const nextStack = (mailResp) => {
    // Process Mail Response
    io.to(reqBody.myHold).emit("mailStatus", mailResp);
    for (let i = 0; i < mailResp.length; i++) {
      const each = mailResp[i];
      // Stop Process if sending failed from server side
      if (each[1] !== 1) {
        io.to(reqBody.myHold).emit("notify", {
          type: "e",
          msg: "Mailing Complete : an Issue terminated the process in mid.",
        });
        io.to(reqBody.myHold).emit("cancelRest");
        return false;
      }
    }
    if (queue.length > 1) queue.splice(0, mailPerInit);
    else queue = [];
    //
    if (queue.length) {
      delay2Sec().then(() => {
        initiateMail(
          transporter,
          mailBody,
          queue,
          reqBody,
          outboxList,
          tokenList,
          mailPerInit
        );
      });
    } else
      io.to(reqBody.myHold).emit("notify", {
        type: "s",
        msg: "Mailing Complete.",
      });
  };
  //
  const promiseColl = [];
  const qLen = queue.length;
  for (let i = 0; i < mailPerInit && i < qLen; i++) {
    const sendTo = queue[i];
    const promise = initSend(
      transporter,
      mailBody,
      reqBody,
      sendTo,
      outboxList,
      tokenList
    );
    promiseColl.push(promise);
  }
  Promise.all(promiseColl).then(nextStack);
}
async function requestAccessToken(req, reqBody, next) {
  const tempClient = oAuth2Client;
  tempClient.setCredentials({ refresh_token: reqBody.token });
  //
  let accessToken = "";
  try {
    accessToken = await tempClient.getAccessToken();
  } catch (error) {
    if (error.response.data.error === "invalid_grant")
      storeErr(
        req,
        `Unable to get access token for Invitation Mailer Account -: ${reqBody.from}`
      );
    else storeErr(req, error);
    io.to(reqBody.myHold).emit("cancelRest");
    return next(
      createErr.Unauthorized(
        "Mailer A/C Authentication Failed.<br>Contact admnistrator to know how to fix."
      )
    );
  }
  //
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: reqBody.from,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      refreshToken: reqBody.token,
      accessToken: accessToken,
    },
  });
  return transporter;
}
//
invRouter.post("/mail", async (req, res, next) => {
  try {
    if (isAdminLogged(req, 2) === false)
      return next(
        createErr.Unauthorized(
          "Admin not Logged In.<br>Please refresh this Page and Login"
        )
      );
    //
    const reqBody = await inviteMailV.validateAsync(req.body);
    //
    const resp = await invitationMdl.find(
      { for: reqBody.passcode },
      "email token"
    );
    if (resp) {
      const outboxList = [],
        token = [];
      resp.forEach((each) => {
        outboxList.push(each.email);
        token.push(each.token);
      });
      const queue = JSON.parse(reqBody.queue);
      if (queue.length) {
        let transporter;
        if (reqBody.token)
          transporter = await requestAccessToken(req, reqBody, next);
        else transporter = awsTransporter;
        if (!transporter) return false;
        //
        const mailBody =
          '<!DOCTYPE html><html lang="en"><head> <meta charset="UTF-8" /> <meta http-equiv="X-UA-Compatible" content="IE=edge" /> <meta name="viewport" content="width=device-width, initial-scale=1.0" /> <title>Test Invitation Mail</title> <style> table { font-family: \'Google Sans\', Roboto, RobotoDraft, Helvetica, Arial, sans-serif; } #linkBtn { font-size: 22px; text-decoration: none; color: #fff; background-color: #0074d9; border: none; outline: none; border-radius: 3px; padding: 3px 10px; } table table th, table table td { padding: 4px 1em; border: 2px solid rgba(128, 128, 128, 0.5); } table a { overflow-wrap: break-word; word-wrap: break-word; word-break: break-all; } .contactLink a { color: black; display: flex; text-decoration: none; } </style></head><reqBody> <center style="margin: 0;">' +
          reqBody.mailBody;
        //
        initiateMail(
          transporter,
          mailBody,
          queue,
          reqBody,
          outboxList,
          token,
          reqBody.token ? 1 : 10 // set number of mails to push in one go
        );
        res.send({
          msg: "Mailing Initiated : Look for notifications and mail Queue writer for updates.",
        });
      } else return next(createErr.BadRequest("Empty Invitation List"));
    } else
      return next(
        createErr.InternalServerError(
          "Something went wrong.<br>Retry after sometime."
        )
      );
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
invRouter.post("/allInvites", async (req, res, next) => {
  try {
    if (isAdminLogged(req, 2) === false)
      return next(
        createErr.Unauthorized(
          "Admin not Logged In.<br>Please refresh this Page and Login"
        )
      );
    //
    const reqBody = await passcodeV.validateAsync(req.body);
    const result = await invitationMdl.find({ for: reqBody.passcode }, "email");
    if (result && result.length) res.send({ data: result });
    else next(createErr.NotFound("No Invitations Found"));
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
//
invRouter.get("/myAuth", async (req, res) => {
  try {
    if (isUserLogged(req)) {
      let redirect = encodeURIComponent(req.originalUrl);
      redirect = `/logout?redirect=${redirect}`;
      res.redirect(redirect);
      return false;
    }
    let param;
    try {
      param = await inviteAuthV.validateAsync(req.query);
    } catch (error) {
      storeErr(req, `Invalid invitation URL ${error} - ${req.originalUrl}`);
      res.send(
        '<center><h1 style="color: orangered;font-family: monospace;">Invalid URL</h1></center>'
      );
      return false;
    }
    const link = `/test?passcode=${param.passcode}`;
    invitationMdl.findOne(
      { for: param.passcode, email: param.email },
      "token",
      (err, record) => {
        if (err || !record) {
          if (err) storeErr(req, error);
          res.send(
            `<center><h1 style="color: orangered;font-family: monospace;">Unable to Authenticate.<br>Nothing to worry<br>you can continue using below link.<br><a href="${link}">${link}</a></h1></center>`
          );
        } else {
          if (record.token === param.myAuthHash) {
            credentialsMdl.findOne(
              { email: param.email },
              "uname name img",
              (err, resp) => {
                // Login and Redirect
                if (err)
                  res.send(
                    `<center><h1 style="color: orangered;font-family: monospace;">Something went wrong.<br>Nothing to worry<br>you can continue using below link.<br><a href="${link}">${link}</a></h1></center>`
                  );
                // Invitation Registration for Closed Event
                if (resp) {
                  processSignIn(
                    req,
                    res,
                    param.email,
                    resp.uname,
                    resp.name,
                    resp.img,
                    1
                  );
                  res.redirect(link);
                } else {
                  directSignUp(req, param.email, "", "", "Invitation SignUp")
                    .then(() => {
                      processSignIn(req, res, param.email, "", "", "", 1);
                      res.redirect(`/test?passcode=${param.passcode}&ds=true`);
                    })
                    .catch(() => {
                      const show = `<center><h1 style="color: orangered;font-family: monospace;">Due to some issues you can't continue using this link.<br>Nothing to worry<br>you can continue using below link.<br><a href="${link}">${link}</a></h1></center>`;
                      res.send(show);
                    });
                }
              }
            );
          } else {
            storeErr(req, "Auth Key Mismatch" + req.originalUrl);
            res.send(
              `<center><h1 style="color: orangered;font-family: monospace;">Failed to Verify Key<br>Nothing to worry<br>you can continue using below link.<br><a href="${link}">${link}</a></h1></center>`
            );
          }
        }
      }
    );
  } catch (error) {
    storeErr(req, error);
    res.send(
      '<center><h1 style="color: orangered;font-family: monospace;">Invalid URL</h1></center>'
    );
  }
});
// Unsubsctibe
invRouter.get("/unsub", async (req, res) => {
  try {
    let param;
    try {
      param = await inviteUnSubV.validateAsync(req.query);
    } catch (error) {
      console.log(error);
      storeErr(
        req,
        `Invalid inv-unsubscribe URL ${error} - ${req.originalUrl}`
      );
      res.send(
        '<center><h1 style="color: orangered;font-family: monospace;">Invalid URL</h1></center>'
      );
      return false;
    }
    invitationMdl.findOne(
      { for: param.passcode, email: param.email },
      "token",
      (err, record) => {
        const msg =
          '<center><h1 style="color: orangered;font-family: monospace;">Unable to Authenticate.<br>Nothing to worry<br>you can reach us on our WhatsApp 8529493017, your request will be processed.</h1></center>';
        if (err || !record) {
          if (err) storeErr(req, error);
          res.send(msg);
        } else {
          if (record.token === param.myAuthHash) {
            param.userAgent = req.headers["user-agent"];
            param.ip = req.headers["x-forwarded-for"] || req.ip;
            invUnSubMdl.create(param, (err, record) => {
              if (err || !record) {
                storeErr(
                  "",
                  `invite un-sub Store in DB Failed: ${JSON.stringify(obj)}`
                );
                res.send(msg);
              } else
                res.send(
                  '<center><h1 style="color: green;font-family: monospace;">Unsubscription Successful.<br>Please give us some time to process this request and inform the Sender.<br>If you still get mails from this address, please register a complaint using our Contact Us form available on HomePage.<br>If this was by mistake contact your organization or website-Admin to re-subscribe.</h1><center>'
                );
            });
          } else {
            storeErr(
              req,
              "inv-unsubscribe auth-Key mismatch " + req.originalUrl
            );
            res.send(msg);
          }
        }
      }
    );
  } catch (error) {
    storeErr(req, error);
    res.send(
      '<center><h1 style="color: orangered;font-family: monospace;">Invalid URL</h1></center>'
    );
  }
});
let io;
function setSocketConn(ioConn) {
  io = ioConn;
}
module.exports = { invRouter, setSocketConn };
