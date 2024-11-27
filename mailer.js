const { storeErr } = require("./helpers/common");
//
const { awsMailer } = require("./aws_sesMailer");
//
async function initateSend(to, sub, html, text) {
  const mailObject = {
    from: '"Shred Test" <support@shredtest.coderadiant.com>',
    replyTo: "contact@shredtest.coderadiant.com",
    // from: '"Sachin Kumar" <sinha1abc@gmail.com>',
    // replyTo: "sinha1abc@gmail.com",
    to: to,
    subject: sub,
    html: html,
    text: text,
  };
  // send mail with defined transport object
  try {
    const status = await awsMailer(mailObject);
    if (status === true) return true;
    if (status === 3)
      return "Invalid Recepient<br>e-Mail can't be delivered to this Email.";
    else return false;
  } catch (err) {
    return false;
  }
}
const fs = require("fs").promises;
async function mailCreate(to, otp, pswdObj = "") {
  try {
    if (otp > 0) {
      let data = await fs.readFile("htmlMailSource/otp.txt", "utf8");
      data += otp + "</h3> </td> </tr> </tbody> </table> </center>";
      const textMail =
        "We just received a Sign-In Request for this mail Account.Your 6-digit OTP to verify authenticity of your Email-Id is " +
        otp;
      return initateSend(to, "OTP Verification", data, textMail);
    } else if (otp < 0) {
      let data = await fs.readFile(
        "htmlMailSource/suspiciousActivity.txt",
        "utf8"
      );
      if (otp == -1)
        data +=
          'Sign In to our website <a href="https://shredtest.coderadiant.com/" target="_blank">shredtest.coderadiant.com</a>';
      else if (otp == -2)
        data +=
          'OTP Verification during SignUp on our website <a href="https://shredtest.coderadiant.com/" target="_blank">shredtest.coderadiant.com</a>';
      else if (otp == -3) data += "OTP Verification during Password Reset";
      else if (otp == -4) data += " Password Reset";
      else if (otp == -5)
        data +=
          'SignUp on our website <a href="https://shredtest.coderadiant.com/" target="_blank">shredtest.coderadiant.com</a>';
      else data += "Improper Actions";
      data += ".</td> </tr> </tbody> </table> </center>";
      return initateSend(
        to,
        "Suspicious Activity",
        data,
        "Suspicious Activity Detected - WhatsApp for details 8529493017"
      );
    } else if (otp === 0) {
      let data, text, sub;
      if (pswdObj.isGSignIn) {
        data = await fs.readFile("htmlMailSource/gsignup.txt", "utf8");
        sub = "Google SignUp Success";
        text = "Google SignUp - shredtest.coderadiant.com";
      } else {
        data = await fs.readFile("htmlMailSource/invSignUp.txt", "utf8");
        sub = "Verified Registration";
        text = "Account Registered - shredtest.coderadiant.com";
      }
      data += pswdObj.pass;
      data += "</span> </td> </tr> </tbody> </table> </center>";
      return initateSend(to, sub, data, text);
    }
  } catch (error) {
    storeErr("", error);
  }
}
module.exports = { mailCreate };

// (async (params) => {
//   // const mailerResponse = await initateSend(
//   //   "sinha2abc@gmail.com",
//   //   "OTP Verification",
//   //   (Math.floor(Math.random() * (99999 - 11111 + 1)) + 11111).toString(),
//   //   "85469"
//   // );
//   const mailerResponse = await mailCreate("sinha1abc@gmail.com", 85469);
//   console.log({ mailerResponse });
// })();
