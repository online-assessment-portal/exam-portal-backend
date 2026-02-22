const MailerService = require('./src/services/mailer.service.js').default;

const mailerService = new MailerService(process.env.MAIL_PROVIDER || 'aws');

async function mailCreate(to, otp, pswdObj = '') {
  try {
    if (otp > 0) {
      const result = await mailerService.sendOTP(to, otp);
      return result.success;
    } else if (otp < 0) {
      const result = await mailerService.sendSuspiciousActivity(to, otp);
      return result.success;
    } else if (otp === 0) {
      const result = await mailerService.sendSignUpConfirmation(
        to,
        pswdObj.pass,
        pswdObj.isGSignIn,
      );
      return result.success;
    }
  } catch (error) {
    console.error(error);
    return false;
  }
}
module.exports = { mailCreate };
