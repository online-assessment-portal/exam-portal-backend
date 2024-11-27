const express = require('express');
const router = express.Router();
//
const fetch = require('node-fetch');
//
const createErr = require('http-errors');
// Compiler
const accessToken = process.env.Access_Token;
const endpoint = process.env.ENDPOINT;
//
const submitURL = `https://${endpoint}/api/v4/submissions?access_token=${accessToken}`;
//
function sleep(ins) {
  return new Promise((res) => {
    setTimeout(() => {
      res();
    }, ins * 1000);
  });
}
//
const { URLSearchParams } = require('url');
// Shpere Engine Error Handler
function seErrHandler(err) {
  const statusCode = res.status;
  storeErr('', err);
  if (statusCode == 401)
    createErr.BadRequest('Invalid Access<br>Inform Test Incharge');
  else if (statusCode == 402)
    createErr.BadRequest(
      'Unable to create submission.<br>Retry after few minutes'
    );
  else if (statusCode == 403) createErr.BadRequest('Access Denied');
  else if (statusCode == 404)
    createErr.BadRequest("Code doesn't exist.<br>Submission mismatched");
  else if (statusCode == 400)
    createErr.BadRequest('Bad Request<br>Inform Test Incharge');
  else createErr.BadRequest('Something went wrong.<br>Inform Test Incharge');
}
function getSubmissionStream(submissionId, stream) {
  return new Promise((resolve) => {
    const streamURL = `https://${endpoint}/api/v4/submissions/${submissionId}/${stream}?access_token=${accessToken}`;
    fetch(streamURL)
      .then((res) => {
        if (res.status === 200) return res.text();
        else {
          seErrHandler(res);
          resolve();
        }
      })
      .then((streamTxt) => resolve(streamTxt))
      .catch(() => {
        createErr.BadRequest('Unable to submit your codes');
        resolve();
      });
  });
}
function intiateStreamCheck(submissionId, streams, obj) {
  return new Promise((resolve) => {
    let stream;
    if (streams.error) stream = 'error';
    else if (streams.cmpinfo) stream = 'cmpinfo';
    else if (streams.output) stream = 'output';
    else {
      obj.output += 'No Output and No Errors';
      resolve();
    }
    getSubmissionStream(submissionId, stream).then((streamResp) => {
      if (stream === 'error') obj.err += streamResp;
      else obj.output += streamResp;
      resolve();
    });
  });
}
function getSubmission(submissionId, extraSleep, obj) {
  return new Promise((resolve) => {
    const getSubURL = `https://${endpoint}/api/v4/submissions/${submissionId}?access_token=${accessToken}`;
    fetch(getSubURL)
      .then((res) => {
        if (res.status === 200) return res.json();
        else {
          seErrHandler(res);
          resolve();
        }
      })
      .then((response) => {
        const statusCode = response.result.status.code;
        let sleepFor = 0;
        if (response.executing === true) {
          if (statusCode == 0) sleepFor = 2;
          else if (statusCode == 1 || statusCode == 2) sleepFor = 1;
          else if (statusCode == 3) {
            if (extraSleep) sleepFor = 2;
            else sleepFor = 0.5;
          } else sleepFor = 3;
          sleep(sleepFor).then(() =>
            getSubmission(submissionId, 0, obj).then(() => resolve())
          );
        } else if (response.executing === false) {
          obj.time = response.result.time;
          obj.memory = response.result.memory;
          if (statusCode === 15) {
            const streams = response.result.streams;
            intiateStreamCheck(submissionId, streams, obj).then(() =>
              resolve()
            );
          } else if (statusCode === 11) {
            obj.err += `compilation error - ${response.result.signal_desc}\n`;
            const streams = response.result.streams;
            intiateStreamCheck(submissionId, streams, obj).then(() =>
              resolve()
            );
          } else if (statusCode === 12) {
            obj.err += `runtime error - ${response.result.signal_desc}\n`;
            const streams = response.result.streams;
            intiateStreamCheck(submissionId, streams, obj).then(() =>
              resolve()
            );
          } else if (statusCode === 13) {
            obj.err += 'Time-limit exceeded';
          } else if (statusCode === 17) {
            obj.err += 'memory limit exceeded';
            resolve();
          } else if (statusCode === 19) {
            obj.err += 'illegal system call';
            resolve();
          } else if (statusCode === 20) {
            obj.err += 'internal error';
            resolve();
          } else {
            obj.err += 'internal server error';
            resolve();
          }
        } else {
          obj.err += 'Server Error - Check for Errors in your code';
          resolve();
        }
      })
      .catch((err) => {
        storeErr('', err);
        createErr.InternalServerError('Unable to submit your codes');
        resolve();
      });
  });
}
const { compilerV } = require('./helpers/joiSchema');
const { storeErr } = require('./helpers/common');
router.post('/cV1/', async (req, res, next) => {
  try {
    const body = await compilerV.validateAsync(req.body);
    const submissionData = new URLSearchParams();
    //
    const code = Buffer.from(body.resource, 'base64').toString();
    const input = Buffer.from(body.fordata, 'base64').toString();
    submissionData.append('source', code);
    submissionData.append('compilerId', body.target);
    submissionData.append('compilerVersionId', body.useflow);
    submissionData.append('input', input);
    // attempt to make submission
    let sleepFor = 0,
      extraSleep = false;
    const obj = { err: '', output: '' };
    if (submissionData.compilerId === 39) {
      sleepFor = 9;
      extraSleep = true;
    } else sleepFor = 2;
    //
    fetch(submitURL, { method: 'POST', body: submissionData })
      .then((res) => {
        if (res.status === 201) return res.json();
        else throw new Error(res.statusText);
      })
      .then((response) => {
        sleep(sleepFor).then(() => {
          getSubmission(response.id, extraSleep, obj).then(() => {
            // obj.output = Buffer.from(obj.output).toString("base64");
            res.send(obj);
          });
        });
      })
      .catch((err) => {
        storeErr(req, err);
        return next(createErr.BadRequest('Unable to submit your codes'));
      });
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, err);
    next(error);
  }
});
module.exports = router;
