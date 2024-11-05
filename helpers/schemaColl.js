const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const errStoreSch = new Schema({
  email: { type: String, default: "" },
  error: { type: String, default: "" },
  ip: { type: String, default: "" },
  userAgent: { type: String, default: "" },
  time: { type: Date, default: Date.now() },
});
const errMdl = model("error", errStoreSch);
//
const adminCredSch = new Schema({
  uname: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: String,
  org: String,
  img: String,
  imgUpKey: String,
  mailAcc: { type: String, default: "{}" },
  registered_On: { type: Date, default: Date.now },
  updated_On: Date,
});
const adminCredMdl = model("admin_cred", adminCredSch);
//
const credentialSch = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  uname: { type: String, unique: true, default: "" },
  name: { type: String, default: "" },
  img: { type: String, default: "https://i.ibb.co/QpJYCQ7/UL8Ijh0w.png" },
  delImg: { type: String, default: "" },
  createdOn: { type: Date, default: Date.now() },
  block: { type: Number, default: 0 },
  result: { type: String, default: "{}" },
  gId: { type: String, default: "" },
});
const credentialsMdl = model("credentials", credentialSch);
//
const qBankSch = new Schema({
  passcode: {
    type: String,
    unique: true,
    required: true,
  },
  strtTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  open: { type: Boolean, required: true },
  isFixedDur: { type: Boolean, required: true },
  dur: { type: String, required: true },
  testInfo: { type: String, required: true },
  qBank: { type: String, required: true },
  crctOpt: { type: String, required: true },
  status: { type: Number, required: true, default: 0 },
  admin: { type: String, required: true },
});
const qBankMdl = model("testinfo", qBankSch);
//
const invSch = new Schema({
  email: { type: String, required: true },
  for: { type: String, required: true },
  token: { type: String, required: true },
  server: { type: String, required: true },
});
const invitationMdl = model("invitations", invSch);
// Invitation un-Subscribe
const invUnSub = new Schema({
  passcode: { type: String, required: true },
  email: { type: String, required: true },
  sender: { type: String, required: true },
  type: { type: String, required: true },
  ip: { type: String, default: "" },
  userAgent: { type: String, default: "" },
  time: { type: Date, default: Date.now() },
});
const invUnSubMdl = model("inv_unsub", invUnSub);
//
const respSchObj = {
  passcode: { type: String, required: true },
  email: { type: String, required: true },
  entryCtr: { type: Number, default: 1 },
  firstEntry: { type: Date, default: Date.now },
  crntSec: { type: Number, default: 0 },
  status: { type: String, default: null },
  libSel: { type: String, default: null },
  questionnaire: { type: String, default: null },
  response: { type: String, default: null },
  tcResponse: { type: String, default: null },
  cdLangId: { type: String, default: null },
  submittedOn: { type: Date, default: null },
  vData: {
    type: String,
    default: '{"rsz":0,"fsv":0,"wfo":0,"mpv":0,"spv":0,"devT":0,"offline":""}',
  },
  sSize: { type: String, default: null },
  ip: { type: String, default: null },
  uA: { type: String, default: null },
  result: { type: String, default: null },
  score: { type: Number, default: 0 },
  exmnrMark: { type: String, default: null },
  exmnrCmnt: { type: String, default: null },
  negMark: { type: Number, default: 0 },
  finalScore: { type: Number, default: 0 },
  sRank: { type: Number, default: null },
  aRank: { type: Number, default: null },
};
const respSch = new Schema(respSchObj);
const responsesMdl = model("responses", respSch);
//
const joinSchema = new Schema({
  passcode: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  peerId: { type: String, required: true },
  socketId: { type: String, required: true },
  cam: { type: Boolean, required: true },
  mic: { type: Boolean, required: true },
  scrn: { type: Boolean, required: true },
});
const joinModel = model("livecand", joinSchema);
//
const feedbackSch = new Schema({
  email: { type: String, default: "" },
  passcode: { type: String, default: "" },
  feedback: { type: String, default: "" },
});
const feedbackMdl = model("feedback", feedbackSch);
//
const contactSch = new Schema({
  name: { type: String, default: "" },
  mailId: { type: String, default: "" },
  mobNo: { type: String, default: "" },
  msg: { type: String, default: "" },
});
const contactMdl = model("contactReq", contactSch);
// Sent Mail record
const sentMailSch = new Schema({
  email: { type: String, required: true },
  mailUID: { type: String, required: true },
  sentAt: { type: Date, default: Date.now() },
});
const sentMailMdl = model("sentMail", sentMailSch);
// Email un-Subscriber List
const emailUnSub = new Schema({
  email: { type: String, required: true },
  ip: { type: String, default: "" },
  userAgent: { type: String, default: "" },
  time: { type: Date, default: Date.now() },
});
const emailUnSubMdl = model("mail_unsub", emailUnSub);
// Email re-Subscriber List
const emailReSub = new Schema({
  email: { type: String, required: true },
  ip: { type: String, default: "" },
  userAgent: { type: String, default: "" },
  time: { type: Date, default: Date.now() },
});
const emailReSubMdl = model("mail_resub", emailReSub);
//
module.exports = {
  errMdl,
  adminCredMdl,
  credentialsMdl,
  qBankMdl,
  invitationMdl,
  invUnSubMdl,
  responsesMdl,
  joinModel,
  feedbackMdl,
  contactMdl,
  //
  sentMailMdl,
  emailUnSubMdl,
  emailReSubMdl,
};
