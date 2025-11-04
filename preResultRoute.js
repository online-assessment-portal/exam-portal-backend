const express = require('express');
const router = express.Router();
//
const createErr = require('http-errors');
const { isAdminLogged, storeErr } = require('./helpers/common');
const {
  passcodeV,
  uploadRankV,
  uploadResV,
  getResultStrV,
  excelDnV,
  showResV,
} = require('./helpers/joiSchema');
const { qBankMdl, responsesMdl, credentialsMdl } = require('./helpers/schemaColl');
//
router.post('/getResponseData/', async (req, res, next) => {
  try {
    const uname = isAdminLogged(req, 2);
    if (uname === false)
      return next(
        createErr.Unauthorized('Admin not Logged In.<br>Please refresh this Page and Login'),
      );
    const body = await passcodeV.validateAsync(req.body);
    const promise1 = qBankMdl.findOne({ passcode: body.passcode });
    const promise2 = responsesMdl.find({ passcode: body.passcode });
    const response = await Promise.all([promise1, promise2]);
    if (response.length || response[0]) {
      if (response[0].admin !== uname) {
        storeErr(req, `${uname} tries to get Responses of ${body.passcode} out of organization.`);
        return next(
          createErr.Unauthorized(
            "You don't have sufficient Rights to access Test of some other Organization.",
          ),
        );
      }
      //
      if (response[1] && response[1].length) {
        const obj = {
          testData: response[0],
          cand: response[1],
          passcode: body.passcode,
        };
        res.send(obj);
      } else next(createErr.UnprocessableEntity('No User Has Participated in this Test/Event.'));
    } else next(createErr.NotFound('No Test/Event is available with this Passcode.'));
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
//
router.post('/uploadResult/', async (req, res, next) => {
  try {
    if (isAdminLogged(req, 2) === false)
      return next(
        createErr.Unauthorized('Admin not Logged In.<br>Please refresh this Page and Login'),
      );
    const body = await uploadResV.validateAsync(req.body);
    //
    const mailList = JSON.parse(body.mailList);
    const scrDetList = JSON.parse(body.scrDet);
    const ttlScrList = JSON.parse(body.total);
    const negMarkList = JSON.parse(body.negMark);
    const eMarksList = JSON.parse(body.eMarks);
    const eCmntsList = JSON.parse(body.eCmnts);
    const flScrList = JSON.parse(body.finalScore);
    const promiseColl = [];
    mailList.forEach((each, i) => {
      const promise = responsesMdl.updateOne(
        { passcode: body.passcode, email: each },
        {
          result: JSON.stringify(scrDetList[i]),
          score: ttlScrList[i],
          negMark: negMarkList[i],
          exmnrMark: JSON.stringify(eMarksList[i]),
          exmnrCmnt: JSON.stringify(eCmntsList[i]),
          finalScore: flScrList[i],
        },
      );
      promiseColl.push(promise);
    });
    Promise.all(promiseColl)
      .then((response) => {
        let failCtr = 0,
          modified = 0;
        response.forEach((each) => {
          if (each && each.ok) {
            if (each.nModified) modified++;
          } else failCtr++;
        });
        if (failCtr) {
          storeErr(req, `Result Uploaded: ${body.passcode}, failed for ${failCtr}`);
          next(
            createErr.Conflict(`Result was Upload,but Failed to upload for ${failCtr} Candidates`),
          );
        } else
          res.send({
            msg: `Result Uploaded successfully.<br>You can now print/download the Result.<br>New modifications ${modified}`,
          });
      })
      .catch((err) => {
        storeErr(req, err);
        next(createErr.Conflict('Result Uploaded, but Failed to upload for some Candidates'));
      });
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
//
router.post('/uploadRanking/', async (req, res, next) => {
  try {
    if (isAdminLogged(req, 2) === false)
      return next(
        createErr.Unauthorized('Admin not Logged In.<br>Please refresh this Page and Login'),
      );
    const body = await uploadRankV.validateAsync(req.body);
    const spms = JSON.parse(body.spms);
    const fsRank = JSON.parse(body.fsRank);
    const promiseColl = [];
    spms.forEach((each, i) => {
      const promise = responsesMdl.updateOne(
        { passcode: body.passcode, email: each[0] },
        {
          sRank: fsRank[i],
          aRank: each[1],
        },
      );
      promiseColl.push(promise);
    });
    const response = await Promise.all(promiseColl);
    if (response) {
      let failCtr = 0,
        modified = 0;
      response.forEach((each) => {
        if (each && each.ok) {
          if (each.nModified) modified++;
        } else failCtr++;
      });
      if (failCtr) {
        storeErr(req, `Ranking Uploaded: ${body.passcode}, failed for ${failCtr}`);
        next(createErr.Conflict(`Ranking Uploaded,but Failed to upload for ${failCtr} Candidates`));
      } else
        res.send({
          msg: `Ranking Uploaded successfully.<br>New modifications ${modified}`,
        });
    } else
      next(
        createErr.InternalServerError('Something went wrong: Failed for some of the Candidates'),
      );
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
//
router.post('/downloadExcel/', async (req, res, next) => {
  try {
    if (isAdminLogged(req, 2) === false)
      return next(
        createErr.Unauthorized('Admin not Logged In.<br>Please refresh this Page and Login'),
      );
    const body = await excelDnV.validateAsync(req.body);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(body.html);
    res.end();
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
//
router.post('/getResultStr/', async (req, res, next) => {
  try {
    if (isAdminLogged(req, 2) === false)
      return next(
        createErr.Unauthorized('Admin not Logged In.<br>Please refresh this Page and Login'),
      );
    const body = await getResultStrV.validateAsync(req.body);
    body.mailList = JSON.parse(body.mailList);
    const resultStr = await credentialsMdl
      .find()
      .select('result')
      .where('email')
      .in(body.mailList)
      .exec();
    if (resultStr) {
      const obj = {
        msg: 'Data Collected.<br>Preparing to declare Result.',
        data: JSON.stringify(resultStr),
      };
      res.send(obj);
    }
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
//
router.post('/iniShowResult/', async (req, res, next) => {
  try {
    if (isAdminLogged(req, 2) === false)
      return next(
        createErr.Unauthorized('Admin not Logged In.<br>Please refresh this Page and Login'),
      );
    const body = await showResV.validateAsync(req.body);
    //
    const mailList = JSON.parse(body.mailList);
    const resultStr = JSON.parse(body.showResData);
    const promiseColl = [];
    mailList.forEach((each, i) => {
      const promise = credentialsMdl.updateOne(
        { email: each },
        {
          result: resultStr[i],
        },
      );
      promiseColl.push(promise);
    });
    const response = await Promise.all(promiseColl);
    if (response && response.length) {
      let failCtr = 0,
        modified = 0;
      response.forEach((each) => {
        if (each && each.ok) {
          if (each.nModified) modified++;
        } else failCtr++;
      });
      let msg;
      if (failCtr)
        msg = `Result Uploaded and declared,but Failed to upload for ${failCtr} Candidates.<br>New declarations: ${modified}`;
      else
        msg = `Result was uploaded and declared successfully.<br>Total Declarations: ${mailList.length}<br>New declarations: ${modified}`;
      res.send({ msg });
    } else
      next(
        createErr.InternalServerError('Something went wrong: Failed for some of the Candidates'),
      );
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
//
module.exports = router;
