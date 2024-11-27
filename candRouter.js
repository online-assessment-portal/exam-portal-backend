const express = require("express");
const candRouter = express.Router();
//
const createErr = require("http-errors");
//
const { storeErr, isUserLogged } = require("./helpers/common");
//
const {
  qBankMdl,
  responsesMdl,
  feedbackMdl,
  credentialsMdl,
} = require("./helpers/schemaColl");
//

const myDict = [
    "testOnCmnd",
    "isEventAuth",
    "liveCmnd",
    "myPick",
    "lastPick",
    "handleVio",
    "ckOrder",
    "pullOff",
    "pushRes",
    "qContent",
    "prebuild",
    "attempt",
    "review",
    "green",
    "yellow",
    "clear",
    "check",
    "mark",
    "pnpOs",
    "virtualize",
    "keepTrack",
    "freeView",
    "testOffCmnd",
    "negCand",
    "clearResp",
    "messPre",
    "bearPull",
    "reAlloc",
    "freeMaloc",
    "vmClear",
    "forceEnd",
    "rebuild",
    "postbuild",
    "shuffle",
    "deGrade",
    "upGrade",
    "poctoC",
    "invigC",
    "shieldFact",
    "browserR",
    "camView",
    "clearAngle",
    "micPober",
    "shareScr",
    "reShare",
    "holdTest",
    "cancelTest",
    "hackP",
    "myCha",
    "careFlow",
  ],
  indexArr = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
    40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  ];
function sliceQBank(testObj, qBank) {
  qBank = Buffer.from(qBank).toString("base64");
  const rndmIArr = indexArr.sort(function () {
    return Math.round(Math.random()) - 0.5;
  });
  const sflDict = [];
  rndmIArr.forEach((each) => {
    sflDict.push(myDict[each]);
  });
  let len = qBank.length,
    eachSlice = 8;
  if (len / eachSlice > 5) {
    eachSlice = len / 5;
    if (len % 5 > 0) eachSlice += 1;
  }
  //
  const arr = [];
  do {
    const piece = qBank.slice(0, eachSlice);
    arr.push(piece);
    qBank = qBank.slice(eachSlice);
    len = qBank.length;
  } while (len);
  //
  arr.forEach((each, i) => {
    testObj[sflDict[i]] = each;
  });
  testObj.dictIndex = JSON.stringify(indexArr);
  return testObj;
}
const toDel = ["admin", "crctOpt", "testInfo", "qBank", "_id", "__v", "admin"];
function processTest(test, startIn, endIn) {
  test.testBuild0 = startIn;
  test.testBuild1 = endIn;
  test.setPortalInit = Buffer.from(test.testInfo).toString("base64");
  sliceQBank(test, test.qBank);
  //
  toDel.forEach((each) => {
    delete test[each];
  });
  return test;
}
function makeDateTimeReadable(recDate, type) {
  const dateObj = new Date(recDate);
  const year = dateObj.getFullYear();
  // month as 2 digits (MM)
  const month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
  // date as 2 digits (DD)
  const date = ("0" + dateObj.getDate()).slice(-2);
  // hours as 2 digits (hh)
  let hours = dateObj.getHours();
  // minutes as 2 digits (mm)
  const minutes = ("0" + dateObj.getMinutes()).slice(-2);
  // date & time as YYYY-MM-DD hh:mm format:
  if (type == 1) {
    let str = "";
    str = date + "-" + month + "-" + year + " ";
    //
    let ampm = "AM";
    //
    if (hours > 12) {
      hours -= 12;
      ampm = "PM";
    } else if (hours === 0) hours = 12;
    str += ("0" + hours).slice(-2);
    //
    str += ":" + minutes + " " + ampm;
    //
    return str;
  }
}
const {
  passcodeV,
  libSelV,
  qsnrV,
  submitTestV,
  feedbackV,
} = require("./helpers/joiSchema");
candRouter.post("/examInfo/", async (req, res, next) => {
  try {
    const email = isUserLogged(req, 3);
    if (!email) {
      return next(
        createErr.Unauthorized(
          "Candidate not Logged In / was inactive for a long time.<br>Please refresh this Page and SignIn."
        )
      );
    }
    //
    const body = await passcodeV.validateAsync(req.body);
    //
    qBankMdl
      .findOne({ passcode: body.passcode }, (err, test) => {
        if (err) {
          if (err) storeErr(req, err);
          return next(
            createErr.InternalServerError(
              "Something went wrong: Error encountered.<br>Sorry for the inconvienience."
            )
          );
        } else if (test) {
          let now = Date.now(),
            testStart = new Date(test.strtTime).getTime(),
            testEnd = new Date(test.endTime).getTime(),
            startIn = Math.trunc((testStart - now) / 1000),
            endIn = Math.trunc((testEnd - now) / 1000);
          if (startIn >= 305) {
            let entryIn = Math.round(startIn / 60) - 4,
              str = "";
            if (entryIn > 60) {
              str = Math.trunc(entryIn / 60) + "hr(s)";
              entryIn = Math.ceil(entryIn % 60);
            }
            str += ` ${entryIn} min(s)`;
            //
            const showMsg =
              `Too Early for the Test/Event.<br>Start Time is ` +
              makeDateTimeReadable(test.strtTime, 1) +
              `.<br>Entry will Open 5minutes before Start Time.<br> ie. after ` +
              str;
            return next(createErr.BadRequest(showMsg));
          } else if (startIn < 0) startIn = 0;
          //
          responsesMdl
            .findOne(
              { email: email, passcode: body.passcode },
              "crntSec status questionnaire response tcResponse cdLangId firstEntry libSel",
              async (err, cand) => {
                if (err) {
                  storeErr(req, err);
                  return next(
                    createErr.InternalServerError(
                      "Something went wrong: Error encountered.<br>Sorry for the inconvienience."
                    )
                  );
                } else if (cand) {
                  // Update Entry
                  await responsesMdl.updateOne(
                    { _id: cand._id },
                    {
                      $inc: { entryCtr: 1 },
                    }
                  );
                  //
                  // Calculate EndIn in case of Fixed Duration Test
                  if (test.isFixedDur) {
                    // If taken 5min before entry
                    if (new Date(cand.firstEntry) < new Date(test.strtTime))
                      cand.firstEntry = test.strtTime;
                    endIn =
                      parseInt(test.dur) * 60 -
                      Math.trunc(
                        (now - new Date(cand.firstEntry).getTime()) / 1000
                      );
                  }
                  if (cand.crntSec === -1) {
                    // Verify if his Test Time is Over in case of Fixed Duration
                    if (test.isFixedDur && endIn <= 0) {
                      const msg = `Time's Up...<br>This Test/Event was of fixed Duration and you have already Appeared for that Time.<br>You started this Test/Event at-: ${makeDateTimeReadable(
                        test.endTime,
                        1
                      )}<br>For duration-: ${
                        test.dur
                      } minutes<br>Status-: Appeared and Submitted`;
                      return next(createErr.BadRequest(msg));
                    } else
                      return next(
                        createErr.BadRequest(
                          "Already Appeared.<br>Test Submitted."
                        )
                      );
                  }
                  if (cand.status) {
                    cand.candStatusNull = Buffer.from(cand.status).toString(
                      "base64"
                    );
                    delete cand.status;
                    //
                    cand.infoResQRB = Buffer.from(cand.response).toString(
                      "base64"
                    );
                    delete cand.response;
                    //
                    cand.trpOSFail = Buffer.from(cand.tcResponse).toString(
                      "base64"
                    );
                    delete cand.tcResponse;
                    //
                    cand.myAttempt = cand.cdLangId;
                    delete cand.cdLangId;
                  }
                  //
                  test = { ...cand, ...test };
                  test.Entry = 0;
                  if (test.questionnaire) test.questionnaire = true;
                  res.send(processTest(test, startIn, endIn));
                } else if (endIn < 0) {
                  const show = `Entry Closed at ${makeDateTimeReadable(
                    test.endTime,
                    1
                  )}.<br>No new Registrations will be accepted.`;
                  return next(createErr.BadRequest(show));
                } else {
                  const invReg = req.signedCookies.invReg;
                  // If test is of Type Open Test or the User is Invited which can be determined by session data invReg - Register the User
                  if (test.open || invReg) {
                    if (!test.open && invReg !== email) {
                      storeErr(
                        req,
                        `Invitation Mail - ${invReg} and Registration Mail ${email}.`
                      );
                      return next(
                        createErr.BadRequest(
                          "Invitation Mail and Registration Mail mismatch."
                        )
                      );
                    }
                    responsesMdl.create(
                      { email: email, passcode: body.passcode },
                      (err, created) => {
                        if (err || !created) {
                          if (err) storeErr(req, err);
                          else
                            storeErr(
                              req,
                              `Failed to Register: ${email} for ${body.passcode}`
                            );
                          return next(
                            createErr.InternalServerError(
                              "Something went wrong: Error encountered.<br>Sorry for the inconvienience."
                            )
                          );
                        } else {
                          test.Entry = 1;
                          test.crntSec = 0;
                          test.firstEntry = created.firstEntry;
                          //
                          if (test.isFixedDur)
                            endIn = parseInt(test.dur) * 60 + startIn;
                          //
                          io.to(`${body.passcode}_admin`).emit(
                            "newRegistration",
                            { email: email }
                          );
                          //
                          res.send(processTest(test, startIn, endIn));
                        }
                      }
                    );
                  } else {
                    storeErr(req, `${email} wanted to join ${body.passcode}`);
                    return next(
                      createErr.Unauthorized(
                        `This Test/Event is of Invite Only in nature.<br>You can join using invitation link only.`
                      )
                    );
                  }
                }
              }
            )
            .lean();
        } else
          next(createErr.NotFound("No Test/Event exists with this Passcode."));
      })
      .lean();
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
candRouter.post("/storeLibSel", async (req, res, next) => {
  try {
    const email = isUserLogged(req, 3);
    if (!email)
      return next(
        createErr.Unauthorized(
          "Candidate not Logged In / was inactive for a long time.<br>Please refresh this Page and SignIn."
        )
      );
    //
    const body = await libSelV.validateAsync(req.body);
    //
    responsesMdl.updateOne(
      { email: email, passcode: body.passcode },
      { libSel: body.libSel },
      (err, response) => {
        if (err || !(response && response.ok)) {
          if (err) storeErr(req, err);
          return next(
            createErr.InternalServerError(
              "Something went wrong: Error encountered.<br>Sorry for the inconvienience."
            )
          );
        } else res.send({ status: "Stored" });
      }
    );
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
// Submit Questionnaire
candRouter.post("/submitQnr/", async (req, res, next) => {
  try {
    const email = isUserLogged(req, 3);
    if (!email)
      return next(
        createErr.Unauthorized(
          "Candidate not Logged In / was inactive for a long time.<br>Please refresh this Page and SignIn."
        )
      );
    //
    const body = await qsnrV.validateAsync(req.body);
    //
    responsesMdl.updateOne(
      { email: email, passcode: body.passcode },
      { questionnaire: body.response },
      (err, response) => {
        if (err || !(response && response.ok)) {
          if (err) storeErr(req, err);
          return next(
            createErr.InternalServerError(
              "Something went wrong: Error encountered.<br>Sorry for the inconvienience."
            )
          );
        } else {
          let msg = "Questionnaire Submitted.";
          if (response.nModified === 0) msg += "<br>No new modifications.";
          res.send({ notify: msg });
        }
      }
    );
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
// Store ClientSide Errors
candRouter.post("/mystore/", async (req, res, next) => {
  try {
    storeErr(req, req.body.error);
    res.send({ msg: "Success" });
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
// Submit Test
candRouter.post("/submitTest/", async (req, res, next) => {
  try {
    const email = isUserLogged(req, 3);
    if (!email) {
      return next(
        createErr.Unauthorized(
          "Candidate not Logged In / was inactive for a long time.<br>Please refresh this Page and SignIn."
        )
      );
    }
    //
    const body = await submitTestV.validateAsync(req.body);
    //
    if (body.vData) body.vData = Buffer.from(body.vData, "base64").toString();
    body.submittedOn = Date.now();
    if (body.crntSec === -1) {
      body.ip = req.headers["x-forwarded-for"] || req.ip;
      const headers = req.rawHeaders;
      const i = headers.indexOf("User-Agent");
      if (i >= 0) body.uA = headers[i + 1];
    }
    responsesMdl.updateOne(
      { email: email, passcode: body.passcode },
      body,
      (err, response) => {
        if (err || !(response && response.ok)) {
          if (err) storeErr(req, err);
          return next(
            createErr.InternalServerError(
              "Something went wrong: Error encountered.<br>Sorry for the inconvienience."
            )
          );
        } else res.send({ msg: "Success." });
      }
    );
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
//
candRouter.post("/feedback/", async (req, res, next) => {
  try {
    const email = isUserLogged(req, 3);
    if (!email) {
      return next(
        createErr.Unauthorized(
          "Candidate not Logged In / was inactive for a long time.<br>Please refresh this Page and SignIn."
        )
      );
    }
    //
    const body = await feedbackV.validateAsync(req.body);
    if (!body.feedback) {
      res.send({ msg: "Continued without feedback." });
      return false;
    }
    body.email = email;
    if (!req.session.loggedIn) body.email += "User not logged In.";
    // Formal Verification of send email and logged in email
    feedbackMdl.create(body, (err, response) => {
      if (err || !response) {
        if (err) storeErr(req, err);
        return next(
          createErr.InternalServerError(
            "Something went wrong: Error encountered.<br>Continued without accepting feedback."
          )
        );
      } else if (response)
        res.send({
          msg: "Success",
        });
    });
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
candRouter.get("/fee", async (req, res) => {
  try {
    const data = await feedbackMdl.find();
    let str = "<table>";
    data.forEach((each) => {
      str += `<tr><td>${each.email}</td><td>${each.feedback}</td></tr>`;
    });
    str += "</table>";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(str);
  } catch (error) {}
});
//
candRouter.post("/resultPre/", async (req, res, next) => {
  try {
    const email = isUserLogged(req, 3);
    if (!email) {
      return next(
        createErr.Unauthorized(
          "Candidate not Logged In / was inactive for a long time.<br>Please refresh this Page and SignIn."
        )
      );
    }
    //
    credentialsMdl.findOne({ email: email }, "result", (err, resp) => {
      if (err || !resp) {
        if (err) storeErr(req, err);
        next(
          createErr.InternalServerError(
            "Something went wrong.Please contact if issue persists."
          )
        );
      } else res.send({ data: resp.result });
    });
  } catch (error) {
    storeErr(req, error);
    next(error);
  }
});
//
candRouter.post("/showResult/", async (req, res, next) => {
  try {
    const email = isUserLogged(req, 3);
    if (!email) {
      return next(
        createErr.Unauthorized(
          "Candidate not Logged In / was inactive for a long time.<br>Please refresh this Page and SignIn."
        )
      );
    }
    //
    const body = await passcodeV.validateAsync(req.body);
    const promise1 = qBankMdl.findOne(
      { passcode: body.passcode },
      "testInfo qBank	crctOpt"
    );
    const promise2 = responsesMdl.findOne({
      passcode: body.passcode,
      email: email,
    });
    Promise.all([promise1, promise2])
      .then((resp) => {
        if (!resp[0] || !resp[1])
          return next(
            createErr.NotFound(
              "There was something wrong detected with your Participation.<br>Contact your HR/Incharge."
            )
          );
        const obj = {};
        obj.libSel = resp[1].libSel;
        obj.myNpQVal = resp[1].status;
        obj.cwrnfreso = Buffer.from(resp[1].response).toString("base64");
        obj.ifotrefres = Buffer.from(resp[1].tcResponse).toString("base64");
        obj.cdLangUsed = resp[1].cdLangId;
        obj.scoreDet = resp[1].result;
        obj.tsingif = Buffer.from(resp[0].testInfo).toString("base64");
        obj.mybknait = Buffer.from(resp[0].qBank).toString("base64");
        obj.crctOpt = resp[0].crctOpt;
        obj.exmnrMark = resp[1].exmnrMark;
        obj.exmnrCmnt = resp[1].exmnrCmnt;
        obj.total = resp[1].score;
        obj.neg = resp[1].negMark;
        obj.final = resp[1].finalScore;
        res.send(obj);
      })
      .catch((err) => {
        storeErr(req, err);
        next(
          createErr.InternalServerError(
            "Somthing went wrong.<br>Contact if issue persists."
          )
        );
      });
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
let io;
function setSocketCand(ioConn) {
  io = ioConn;
}
module.exports = { candRouter, setSocketCand };
