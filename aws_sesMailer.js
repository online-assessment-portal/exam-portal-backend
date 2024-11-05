const { storeErr } = require("./helpers/common");
const nodemailer = require("nodemailer");
const awsTransporter = nodemailer.createTransport({
  host: process.env.AWS_SES_HOST,
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.AWS_SES_UID,
    pass: process.env.AWS_SES_PSWD,
  },
});
//
async function awsMailer(mailObject) {
  try {
    const info = await awsTransporter.sendMail(mailObject);
    if (info.accepted.length) return true;
    else return 2;
  } catch (err) {
    mailObject.html = mailObject.html.slice(0, 50);
    storeErr(
      `AWS Mail Error - ${err.code} - ${JSON.stringify(mailObject)}`,
      err
    );
    // 2 - Server Error/No Internet Server, 3 - Invalid Recepient, 4 - Auth Failed
    if (err.code === "EENVELOPE") return 3;
    else if (err.code === "EAUTH") return 4;
    else return 2;
  }
}
module.exports = { awsTransporter, awsMailer };
