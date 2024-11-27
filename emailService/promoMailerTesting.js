const { v4: uuidv4 } = require('uuid');
//
const { storeErr } = require('../helpers/common');
//
const { emailV } = require('../helpers/joiSchema');
const { sentMailMdl } = require('../helpers/schemaColl');
const { awsTransporter } = require('../aws_sesMailer');
//
function delay2Sec() {
  return new Promise((res) => {
    setTimeout(() => {
      res();
    }, 2000);
  });
}
//
function prepareAndSend(to) {
  return new Promise(async (resolve, reject) => {
    try {
      to = await emailV.validateAsync({ email: to });
      to = to.email;
    } catch (error) {
      console.log('Email Address Validation Failed Error ' + error + to);
      reject();
    }
    const mailUID = uuidv4();
    const unsubUrl = `http://localhost/email/unsub/${to}/${mailUID}`;
    // Set new parameter value for mail Object
    mailObject.to = to;
    mailObject.html = body1 + unsubUrl + body2;
    mailObject.list.unsubscribe.url = unsubUrl;
    //
    try {
      console.log('Sending to ' + mailObject.to);
      // const info = await awsTransporter.sendMail(mailObject);
      const info = await (() => {
        return new Promise((res) => {
          setTimeout(
            () => {
              res({ accepted: [to] });
            },
            Math.floor(Math.random() * 10000 + 3000)
          );
        });
      })();
      if (info.accepted[0] === to) {
        const store = { email: to, mailUID };
        console.log(store);
        const rndm = Math.floor(Math.random() * 10000 + 3000);
        setTimeout(() => {
          if (rndm > 5000) {
            console.log('Resolved ' + store.email);
            resolve();
          } else {
            console.log('Rejected ' + store.email);
            reject();
          }
        }, rndm);
        // sentMailMdl.create(store, (err, res) => {
        // 	if (err || !res) {
        // 		storeErr(
        // 			"",
        // 			`Sent Email store in DB Failed: ${JSON.stringify(store)}`
        // 		);
        // 		reject();
        // 	} else resolve();
        // });
      } else reject();
    } catch (err) {
      console.log(err);
      storeErr(
        `AWS Mail Error - ${err.code} - Sending to ${mailObject.to}`,
        err
      );
      reject();
    }
  });
}
// process Extracted Stack
async function processStack(stack) {
  // return new Promise((resolve, reject) => {
  const mailColl = [];
  stack.forEach((to) => {
    mailColl.push(prepareAndSend(to));
  });
  return Promise.all(mailColl);
  // Promise.all(mailColl)
  // 	.then(() => resolve())
  // 	.catch(() => reject());
  // });
}
// Function to regulate the email-Address List
async function regulateQueue(list) {
  // Extract a stack of 10
  const stack = list.splice(0, 2);
  console.log('Stack List - ' + stack);
  if (stack.length)
    processStack(stack)
      .then(() => {
        delay2Sec().then(() => {
          regulateQueue(list);
        });
      })
      .catch(() =>
        console.log(
          'Promise.all failure - not all mails were success at regulateQueue'
        )
      );
}
//
const fs = require('fs').promises;
//
let list = [],
  body1 = '',
  body2 = '',
  mailObject = {
    from: '"CEO, Shred Test" <ceo@shredtest.coderadiant.com>',
    subject: 'Free Online Examination Portal',
    replyTo: '"Support" <support@shredtest.coderadiant.com>',
    // to: "", - set at prepare mail
    // html: "", - set at prepare mail
    text: 'Your browser or app does not support this mail. Open it in updated browser / App',
    list: {
      unsubscribe: {
        // url: "", - set at prepare mail
        comment: 'unsublinking',
      },
    },
  };
async function main() {
  list = [];
  body1 = '';
  body2 = '';
  // Read html body from file
  await Promise.all([
    // fs.readFile("./emailService/body1.txt", "utf8"),
    // fs.readFile("./emailService/body2.txt", "utf8"),
    fs.readFile('./body1.txt', 'utf8'),
    fs.readFile('./body2.txt', 'utf8'),
  ])
    .then((val) => {
      list = require('./mailList');
      body1 = val[0];
      body2 = val[1];
    })
    .catch((error) => {
      console.log('Error Reading File\n' + error.message);
    });
  if (!body1 || !body2) return console.log('\nEmpty Body');
  else if (!list.length) return console.log('Mailing List is Empty');
  regulateQueue(list);
}
main();
module.exports = main;
