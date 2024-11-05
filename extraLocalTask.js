const express = require("express");
const router = express.Router();
//
const {
  errMdl,
  invitationMdl,
  responsesMdl,
  joinModel,
  sentMailMdl,
  credentialsMdl,
} = require("./helpers/schemaColl");
router.get("/deleteErrors", async (req, res, next) => {
  const status = await errMdl.deleteMany({
    error: "Admin Invalid Password sinha1abc@gmail.com",
  });
  res.send(status);
});
//
router.get("/delInvitations", async (req, res, next) => {
  const status = await invitationMdl.deleteMany({
    email: "sinha1abc@gmail.com",
  });
  res.send(status);
});
//
router.get("/deleteAllResp", async (req, res, next) => {
  const status = await responsesMdl.deleteMany({ passcode: "AEJC917803" });
  res.send(status);
});
//
router.get("/deleteSentMail", async (req, res, next) => {
  const status = await sentMailMdl.deleteMany();
  res.send(status);
});
//
router.get("/deleteLiveCand", async (req, res, next) => {
  const status = await joinModel.deleteMany({
    passcode: "NBLG623581",
  });
  res.send(status);
});
//
router.get("/deleteAllRes", async (req, res, next) => {
  const status = await credentialsMdl.updateMany({ result: "{}" });
  res.send(status);
});
module.exports = router;
