const express = require('express');
const mailRouter = express.Router();
//
const { storeErr } = require('../helpers/common');
//
const { emailUnSubV } = require('../helpers/joiSchema');
//
const { sentMailMdl, emailUnSubMdl, emailReSubMdl } = require('../helpers/schemaColl');
//
const startMailing = require('./promoMailer');
mailRouter.get('/startSend/:frm/:frmMail', async (req, res) => {
  const param = req.params;
  const status = await startMailing(param);
  res.send(status);
});
//
const startMailingGoogleForm = require('./promoMailerGForm.js');
mailRouter.get('/startSendGForm/:frm/:frmMail', async (req, res) => {
  const param = req.params;
  const status = await startMailingGoogleForm(param);
  res.send(status);
});
// See all sent mails
mailRouter.get('/showall', async (req, res) => {
  let str = '<table border="1"> <thead> <tr> <th>SlNo</th> <th>Email</th> </tr> </thead> <tbody> ';
  sentMailMdl
    .find({}, 'email', (err, data) => {
      if (err) res.send(err.message);
      else if (!data) res.send('No data Found');
      else {
        data.forEach((each, i) => {
          str += `<tr> <td>${i + 1}</td> <td>${each.email}</td> </tr>`;
        });
        str += '</tbody> </table>';
        res.send(str);
      }
    })
    .lean();
});
// Unsubsctibe
mailRouter.get('/:action/:email/:mailUID', async (req, res) => {
  try {
    let param;
    try {
      param = await emailUnSubV.validateAsync(req.params);
    } catch (error) {
      storeErr(req, `Invalid email unsubscribe URL ${error} - ${req.originalUrl}`);
      return res
        .status(401)
        .send(
          '<center><h1 style="color: orangered;font-family: monospace;">Invalid URL</h1></center>',
        );
    }
    sentMailMdl
      .findOne({ email: param.email, mailUID: param.mailUID }, (err, record) => {
        //
        const msg =
          '<center><h1 style="color: orangered;font-family: monospace;">Unable to Authenticate.<br>Nothing to worry<br>you can reach us on our WhatsApp 8529493017, your request will be processed.</h1></center>';
        if (err || !record) {
          if (err) storeErr(req, error);
          else storeErr(req, 'email-unsubscribe no sent mail record found for ' + req.originalUrl);
          return res.status(500).send(msg);
        } else {
          param.userAgent = req.headers['user-agent'];
          param.ip = req.headers['x-forwarded-for'] || req.ip;
          if (param.action === 'unsub')
            emailUnSubMdl.create(param, (err, record) => {
              if (err || !record) {
                storeErr('', `mail un-sub Store in DB Failed: ${JSON.stringify(obj)}`);
                return res.status(500).send(msg);
              } else
                res.send(
                  `<center><h1 style="color: green;font-family: monospace;">Unsubscription Successful.<br> <br><a href="https://shredtest.coderadiant.com/email/resub/${param.email}/${param.mailUID}">Click Here</a> to re-subscribe<br><br>else Please give us some time to process this request and inform the Sender.<br>If you still get mails from this address, please register a complaint using our Contact Us form available on our HomePage.<br> </h1> </center>`,
                );
            });
          else if (param.action === 'resub')
            emailReSubMdl.create(param, (err, record) => {
              if (err || !record) {
                storeErr('', `mail re-sub Store in DB Failed: ${JSON.stringify(obj)}`);
                return res.status(500).send(msg);
              } else
                res.send(
                  `<center><h1 style="color: green;font-family: monospace;">Re-subscription Successful.<br> Thanks for your kind gesture</h1> </center>`,
                );
            });
          else res.status(500).send(msg);
        }
      })
      .lean();
  } catch (error) {
    storeErr(req, error);
    res.send(
      '<center><h1 style="color: orangered;font-family: monospace;">Invalid URL</h1></center>',
    );
  }
});
//
module.exports = mailRouter;
