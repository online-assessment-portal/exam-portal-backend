const { storeErr } = require("./helpers/common");
//
const { awsMailer } = require("./aws_sesMailer");
//
async function initateSend(to, sub, html, text) {
  const mailObject = {
    from: '"Shred Test" <noreply@shredtest.cf>',
    replyTo: "contact@shredtest.cf",
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
        "We just received a SIGN In Request for this mail Account.Your 6-digit OTP to verify aunthenticity of your Email-Id is " +
        otp;
      return initateSend(to, "OTP Verification", data, textMail);
    } else if (otp < 0) {
      let data = await fs.readFile(
        "htmlMailSource/suspiciousActivity.txt",
        "utf8",
      );
      if (otp == -1)
        data +=
          'Sign In to our website <a href="https://shredtest.cf/" target="_blank">shredtest.cf</a>';
      else if (otp == -2)
        data +=
          'OTP Verification during SignUp on our website <a href="https://shredtest.cf/" target="_blank">shredtest.cf</a>';
      else if (otp == -3) data += "OTP Verification during Password Reset";
      else if (otp == -4) data += " Password Reset";
      else if (otp == -5)
        data +=
          'SignUp on our website <a href="https://shredtest.cf/" target="_blank">shredtest.cf</a>';
      else data += "Improper Actions";
      data += ".</td> </tr> </tbody> </table> </center>";
      return initateSend(
        to,
        "Suspicious Activity",
        data,
        "Suspicious Activity Detected - WhatsApp for deatils 8529493017",
      );
    } else if (otp === 0) {
      let data, text, sub;
      if (pswdObj.isGSignIn) {
        data = await fs.readFile("htmlMailSource/gsignup.txt", "utf8");
        sub = "Google SignUp Success";
        text = "Google SignUp - shredtest.cf";
      } else {
        data = await fs.readFile("htmlMailSource/invSignUp.txt", "utf8");
        sub = "Verified Registration";
        text = "Account Registered - shredtest.cf";
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
