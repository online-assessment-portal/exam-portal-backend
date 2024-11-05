const express = require("express");
const createErr = require("http-errors");
require("dotenv").config();
const app = express();
// const morgan = require("morgan");
// app.use(morgan("dev"));
//
const cors = require("cors");
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
//
const helmet = require("helmet");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": [
          "'self'",
          "cdnjs.cloudflare.com",
          "'sha256-VKT9zliU97AHJFMzorwPrsYiy3SStraIWFnV5fZfeSk='", // for babel
          "'unsafe-eval'", // Required for VueJS only
          "'nonce-ekp3ldxrt5qi'",
        ],
        "img-src": ["'self'", "data:", "https://i.ibb.co/"],
        "connect-src": [
          "'self'",
          // "https://0.peerjs.com/",
          // "wss://0.peerjs.com",
          "https://api.imgbb.com/1/upload",
          "https://mypeercleanserve.herokuapp.com/",
          "wss://mypeercleanserve.herokuapp.com",
          "https://mypeerserv.tk/",
          "wss://mypeerserv.tk",
          // "http://localhost:9000/",
          // "ws://localhost:9000",
        ],
        "frame-src": [
          "'self'",
          "*.github.io",
          // "'unsafe-inline'",
          // "'unsafe-eval'",
        ],
        "worker-src": ["blob:"],
      },
    },
  }),
);
//
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));
//
const session = require("express-session");
const redisClient = require("./helpers/redisConnect");
const RedisStore = require("connect-redis")(session);
app.use(
  session({
    store: new RedisStore({
      client: redisClient,
    }),
    secret: process.env.SESSION_SECRET,
    name: "myIdentity",
    // Forces the session to be saved
    // back to the session store
    resave: false,
    // Update maxAge each Request
    rolling: true,
    // Forces a session that is "uninitialized"
    // to be saved to the store
    saveUninitialized: false,
    ttl: 3600000,
    cookie: {
      secure: false, // make true in production
      httpOnly: true,
      maxAge: 3600000, // 60mins
      sameSite: true,
    },
    // proxy: true, // make true in production
  }),
);
//
const cookieParser = require("cookie-parser");
app.use(cookieParser(process.env.COOKIE_SECRET));
//
//
// const csurf = require("csurf");
// app.use(
// 	csurf({
// 		cookie: true,
// 		secure: false, // make true in production
// 		httpOnly: true,
// 		sameSite: true,
// 	})
// );
// Moongoose
const mongoose = require("mongoose");
// const dburi = "mongodb://localhost:27017/exam_db";
const dburi = process.env.DB_URI;
console.log({ dburi });
mongoose.connect(dburi, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});
//Get the default connection
const db = mongoose.connection;
//Bind connection to error event (to get notification of connection errors)
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Monogo Connection OPEN");
});
// Rate Limiter
// const { rateLimiterMiddleware } = require("./helpers/rateLimiter");
// app.use(rateLimiterMiddleware);
//
app.use(express.static(__dirname + "/public"));
//
//
const extraTask = require("./extraLocalTask");
app.use("/e", extraTask);
//
const loginRouter = require("./loginRouter");
app.use("/login", loginRouter);
//
const googleSignIn = require("./googleSignIn");
app.use("/gsign", googleSignIn);
//
const adminRouter = require("./adminRoute");
app.use("/admin", adminRouter);
//
const preResultRouter = require("./preResultRoute");
app.use("/preResult", preResultRouter);
//
const { invRouter, setSocketConn } = require("./invitationRoute");
app.use("/invite", invRouter);
//
const mailRoute = require("./emailService/emailRoute");
app.use("/email", mailRoute);
// EXAMINATION CODING
//
const {
  isUserLogged,
  isAdminLogged,
  storeErr,
  clearAllCookies,
} = require("./helpers/common");
//
function processLogout(req, res) {
  req.session.destroy();
  clearAllCookies(req, res);
  return true;
}
//
const { candRouter, setSocketCand } = require("./candRouter");
app.use("/cand", candRouter);
//
const compilerRouter = require("./compiler");
app.use("/compiler", compilerRouter);
//
const proctorRouter = require("./proctorRoute");
app.use("/proctor", proctorRouter);
//
const headRouter = require("./headRoute");
app.use("/helloHead", headRouter);
//
const uploadRoute = require("./imageUpload");
app.use("/upload", uploadRoute);
//
app.get("/logout/", (req, res) => {
  if (processLogout(req, res)) {
    const query = req.query;
    if (query.redirect) res.redirect(query.redirect);
    else res.send("Logout Success.");
  } else res.send("Something went wrong.");
});
//
app.post("/logout/", (req, res, next) => {
  if (processLogout(req, res)) {
    res.send({ msg: "Logout Success." });
  } else {
    next(
      createErr.InternalServerError(
        "Something went wrong.<br>Request couldn't be placed now.<br>Sorry for the inconvenience caused.",
      ),
    );
  }
});
//
app.get("*", (req, res) => {
  const url = req._parsedUrl.pathname.toLowerCase();
  const param = req.query;
  let userInfo;
  if (url === "/testadmin" || url === "/monitor") {
    userInfo = isAdminLogged(req, 1);
    if (userInfo === false) userInfo = { loggedIn: false };
    if (param.proctor) userInfo.passcode = param.proctor;
  } else {
    const sCookies = req.signedCookies;
    if (!req.session.loggedIn && (sCookies.invReg || sCookies.gsign)) {
      req.session.loggedIn = true;
      req.session.email = sCookies.invReg || sCookies.gsign;
    }
    userInfo = isUserLogged(req, 1);
    if (userInfo === false) userInfo = { loggedIn: false };
    //
    if (userInfo.loggedIn && param.ds) userInfo.ds = true;
    //
    if (param.passcode) userInfo.passcode = param.passcode;
  }
  //
  if (!userInfo) userInfo = { loggedIn: false };
  // const secure = req.csrfToken();
  const secure = "sadsadasds6a6a4sd6a4d6a4d86sa4";
  userInfo.token = secure;
  //
  res.send(
    `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#000000"/><meta name="description" content="New Generation Advanced Online Examination Portal.An easy and most convenient platform for Online assessment of candidates. Offering best-in-class with its classic and eye-soothing design and all that with a guarantee of being most affordable in the whole industry."/><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"><link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"><link rel="manifest" href="/site.webmanifest"><title>Shred Test</title><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" integrity="sha512-c42qTSw/wPZ3/5LBzD+Bw5f7bSF2oxou6wEb+I/lqeaKV5FDIfMvvRp772y4jcJLKuGUOpbJMdg/BTl50fJYAw==" crossorigin="anonymous"/><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" integrity="sha256-eZrrJcwDc/3uDhsdt61sL2oOBY362qM3lon1gyExkL0=" crossorigin="anonymous"/><link rel="preconnect" href="https://fonts.gstatic.com"/><link href="https://fonts.googleapis.com/css2?family=Caveat&family=Noto+Sans+JP&family=Roboto&display=swap" rel="stylesheet"/><link href="/static/css/main.e0f041dc.chunk.css" rel="stylesheet"></head><body><noscript><center style="font-family:'Noto Sans JP',sans-serif"><h1 style="text-align:center">Please Enable JavaScript of your Browser</h1><ul style="text-align:left"><p>Try for following Options see if anyone of them works for you -:<br/>You are facing this condition because your browser settings were altered and that is not allowing the Test to RUN.</p><li>Open Site Settings and Reset Settings for this website.</li><li>Clean Browser Caches and Temporary Files.</li><li>Reset Browser.</li><li>Clean Uninstall and re-install your Browser.</li></ul></center></noscript><div id="root"></div><pre id="userInfo" style="display:none">${JSON.stringify(
      userInfo,
    )}</pre><script nonce="ekp3ldxrt5qi">!function(e){function r(r){for(var n,a,p=r[0],l=r[1],f=r[2],c=0,s=[];c<p.length;c++)a=p[c],Object.prototype.hasOwnProperty.call(o,a)&&o[a]&&s.push(o[a][0]),o[a]=0;for(n in l)Object.prototype.hasOwnProperty.call(l,n)&&(e[n]=l[n]);for(i&&i(r);s.length;)s.shift()();return u.push.apply(u,f||[]),t()}function t(){for(var e,r=0;r<u.length;r++){for(var t=u[r],n=!0,p=1;p<t.length;p++){var l=t[p];0!==o[l]&&(n=!1)}n&&(u.splice(r--,1),e=a(a.s=t[0]))}return e}var n={},o={1:0},u=[];function a(r){if(n[r])return n[r].exports;var t=n[r]={i:r,l:!1,exports:{}};return e[r].call(t.exports,t,t.exports,a),t.l=!0,t.exports}a.m=e,a.c=n,a.d=function(e,r,t){a.o(e,r)||Object.defineProperty(e,r,{enumerable:!0,get:t})},a.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},a.t=function(e,r){if(1&r&&(e=a(e)),8&r)return e;if(4&r&&"object"==typeof e&&e&&e.__esModule)return e;var t=Object.create(null);if(a.r(t),Object.defineProperty(t,"default",{enumerable:!0,value:e}),2&r&&"string"!=typeof e)for(var n in e)a.d(t,n,function(r){return e[r]}.bind(null,n));return t},a.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return a.d(r,"a",r),r},a.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},a.p="/";var p=this.webpackJsonpreactapp=this.webpackJsonpreactapp||[],l=p.push.bind(p);p.push=r,p=p.slice();for(var f=0;f<p.length;f++)r(p[f]);var i=l;t()}([])</script><script src="/static/js/2.73b03c72.chunk.js"></script><script src="/static/js/main.ec8720d1.chunk.js"></script></body></html>`,
  );
});
// Error out if no Router Exists
app.use(async (req, res, next) => {
  next(createErr.NotFound());
});
// Error Handeler Middleware
app.use((err, req, res, next) => {
  let showErr = err.message;
  if (showErr === "invalid csrf token")
    showErr =
      "Security Token mis-match.<br>Refresh/Reload this Page to create a Secure Channel.";
  else if (err.name === "MongoError") {
    showErr =
      "Something went wrong.<br>You request couldn't be fulfilled at the moment.<br>Please retry after sometime.";
    storeErr(req, err);
  }
  res
    .status(err.status || 500)
    .send({ error: { status: err.status || 500, message: showErr } });
});
//
process.env.TZ = "Asia/Kolkata";
//
const http = require("http");
const httpServer = http.Server(app);
//
// const io = require("socket.io")(httpServer);
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
//
const { joinModel } = require("./helpers/schemaColl");
//
io.on("connection", (socket) => {
  // send socket connnection to invitation Route
  setSocketConn(io);
  setSocketCand(io);
  //
  socket.on("join-room", (roomId, data) => {
    // passcode is roomId
    socket.join(roomId);
    // If Candidate Joining
    if (roomId.search("_admin") === -1) {
      data.socketId = socket.id;
      joinModel.create(data, function (err, response) {
        if (err || !response) storeErr("", err);
        else if (response)
          socket.to(`${roomId}_admin`).emit("cand-connected", data);
      });
    } else socket.to(roomId).emit("newProctor", data);
  });
  socket.on("disconnect", () => {
    joinModel.findOneAndDelete({ socketId: socket.id }, (err, status) => {
      if (err) storeErr("", err);
      else if (status)
        socket.to(`${status.passcode}_admin`).emit("cand-disConnected", status);
    });
  });
  //
  socket.on("broadcastTest", (data) => {
    socket.to(data.passcode).emit("recBroadcast", data);
  });
  // Send to all in the Test client will check and close if it was their Proctor
  socket.on("proctorCloseAll", (obj) => {
    socket.to(obj.passcode).emit("closeAll", obj.peerId);
  });
  // Sent to specific in case remove from proctoring list
  socket.on("proctorClose", (obj) => {
    io.to(obj.socketId).emit("closeAll", obj.peerId);
  });
  //
  socket.on("closeMedia", (obj) => {
    io.to(obj.socketId).emit("closeMedia", obj.peerId);
  });
  //
  socket.on("endTest", (socketId, callback) => {
    callback({ done: true });
    io.to(socketId).emit("endTest");
  });
});
//
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, function () {
  console.log(`Server Running on Port ${PORT}`);
});
