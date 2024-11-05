const express = require("express");
const uploadRouter = express.Router();
//
const createErr = require("http-errors");
//
const { storeErr, cookieObj, isUserLogged } = require("./helpers/common");
const { credentialsMdl } = require("./helpers/schemaColl");
//
const multer = require("multer");
const path = require("path");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  // By default, multer removes file extensions so let's add them back
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const imageFilter = function (req, file, cb) {
  // Accept images only
  // Allowed ext
  const filetypes = /jpeg|jpg|png/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);
  //
  if (mimetype && extname) return cb(null, true);
  else {
    const msg = "Only JPG, JPEG &amp; PNG image files are allowed!";
    req.fileValidationError = msg;
    return cb(null, false);
  }
};
//
const fs = require("fs").promises;
const fetch = require("node-fetch");
const FormData = require("form-data");
const imgbbKey = process.env.IMG_BB_KEY;
//
uploadRouter.post("/img", async (req, res, next) => {
  const email = isUserLogged(req, 3);
  if (!email) {
    return next(
      createErr.Unauthorized(
        "User not Logged In / was inactive for a long time.<br>Please refresh this Page and SignIn.",
      ),
    );
  }
  //
  try {
    // 'profile_pic' is the name of our file input field in the HTML form
    const imgUpload = multer({
      storage: storage,
      fileFilter: imageFilter,
      limits: { fileSize: 1000000 },
    }).single("profile_pic");
    //
    imgUpload(req, res, async (err) => {
      // req.file contains information of uploaded file
      // req.body contains information of text fields, if there were any
      if (err instanceof multer.MulterError) {
        storeErr(req, err.message);
        return next(createErr.UnprocessableEntity(err.message));
      } else if (err) {
        storeErr(req, err.message);
        return next(createErr.UnprocessableEntity(err.message));
      } else if (req.fileValidationError) {
        storeErr(req, "Other Image type detected.");
        return next(createErr.UnprocessableEntity(req.fileValidationError));
      } else if (!req.file) {
        storeErr(req, "No image file received.");
        return next(
          createErr.UnprocessableEntity(
            "Please select a valid image file to upload.",
          ),
        );
      } else {
        const formData = new FormData();
        formData.append("key", imgbbKey);
        formData.append("name", req.file.filename);
        const imgPath = path.join(__dirname + "/uploads/" + req.file.filename);
        const base64Img = await fs.readFile(imgPath, { encoding: "base64" });
        formData.append("image", base64Img);
        //
        const promise = await fetch("https://api.imgbb.com/1/upload", {
          method: "POST",
          body: formData,
        });
        const response = await promise.json();
        if (response.success === true && response.status === 200) {
          const url = response.data.url;
          // Update credentials db - and cookies
          const status = await credentialsMdl.updateOne({ email: email }, [
            {
              $set: {
                delImg: { $concat: ["$delImg", response.data.delete_url] },
                img: url,
              },
            },
          ]);
          if (status && status.ok) {
            res.cookie("img", url, cookieObj);
            await fs.unlink(imgPath);
            res.send({ url: url });
          } else
            return next(
              createErr.InternalServerError(
                "Something went wrong Image was uploaded.<br>But it was not successfully associated with your account.<br>Contact webmaster.",
              ),
            );
        } else
          return next(
            createErr.InternalServerError(
              "Something went wrong Image couldn't be uploaded now.<br>Retry after some time.",
            ),
          );
      }
    });
  } catch (error) {
    if (error.isJoi) error.status = 422;
    else storeErr(req, error);
    next(error);
  }
});
//
module.exports = uploadRouter;
