const express = require('express');
const { ExpressPeerServer } = require('peer');
const path = require('path');
const createErr = require('http-errors');
require('dotenv').config();
const fs = require('fs');
const appEnv = process.env.NODE_ENV;
const isDev = appEnv === 'DEV';
const isProd = appEnv === 'PROD';

const app = express();

const http = require('http');
const httpServer = http.createServer(app);

if (isDev) {
  const morgan = require('morgan');
  app.use(morgan('dev'));

  const cors = require('cors');
  app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
}

const helmet = require('helmet');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': [
          "'self'",
          'cdnjs.cloudflare.com',
          "'sha256-VKT9zliU97AHJFMzorwPrsYiy3SStraIWFnV5fZfeSk='", // for babel
          "'unsafe-eval'", // Required for VueJS only
          "'nonce-ekp3ldxrt5qi'",
        ],
        'img-src': ["'self'", 'data:', 'https://i.ibb.co/'],
        'connect-src': [
          "'self'",
          // "https://0.peerjs.com/",
          // "wss://0.peerjs.com",
          'https://api.imgbb.com/1/upload',
          'https://mypeercleanserve.herokuapp.com/',
          'wss://mypeercleanserve.herokuapp.com',
          'https://mypeerserv.tk/',
          'wss://mypeerserv.tk',
          // "http://localhost:9000/",
          // "ws://localhost:9000",
        ],
        'frame-src': [
          "'self'",
          '*.github.io',
          // "'unsafe-inline'",
          // "'unsafe-eval'",
        ],
        'worker-src': ['blob:'],
      },
    },
  })
);
//
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));
//
const session = require('express-session');
const redisClient = require('./helpers/redisConnect');
const RedisStore = require('connect-redis')(session);
app.use(
  session({
    store: new RedisStore({
      client: redisClient,
    }),
    secret: process.env.SESSION_SECRET,
    name: 'myIdentity',
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
      secure: isProd ? true : false,
      httpOnly: true,
      maxAge: 3600000, // 60mins
      sameSite: isProd ? 'none' : 'strict', // "strict"/"lax" for dev
    },
    proxy: isProd ? true : false,
  })
);
//
const cookieParser = require('cookie-parser');
app.use(cookieParser(process.env.COOKIE_SECRET));
//
//
// const csurf = require("csurf");
// app.use(
// 	csurf({
// 		cookie: true,
// 		secure: isProd ? true : false,
// 		httpOnly: true,
// 		sameSite: true,
// 	})
// );
// Moongoose
const mongoose = require('mongoose');
// const dburi = "mongodb://localhost:27017/exam_db";
const dburi = process.env.DB_URI;
mongoose.connect(dburi, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});
//Get the default connection
const db = mongoose.connection;
//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('Monogo Connection OPEN');
});
// Rate Limiter
// const { rateLimiterMiddleware } = require("./helpers/rateLimiter");
// app.use(rateLimiterMiddleware);
//
app.use(express.static(path.join(__dirname, 'public')));

const extraTask = require('./extraLocalTask');
app.use('/e', extraTask);

const loginRouter = require('./loginRouter');
app.use('/login', loginRouter);

const googleSignIn = require('./googleSignIn');
app.use('/gsign', googleSignIn);

const adminRouter = require('./adminRoute');
app.use('/admin', adminRouter);

const preResultRouter = require('./preResultRoute');
app.use('/preResult', preResultRouter);

const { invRouter, setSocketConn } = require('./invitationRoute');
app.use('/invite', invRouter);

const mailRoute = require('./emailService/emailRoute');
app.use('/email', mailRoute);
// EXAMINATION CODING

const {
  isUserLogged,
  isAdminLogged,
  storeErr,
  clearAllCookies,
} = require('./helpers/common');

const { candRouter, setSocketCand } = require('./candRouter');
app.use('/cand', candRouter);

const compilerRouter = require('./compiler');
app.use('/compiler', compilerRouter);

const proctorRouter = require('./proctorRoute');
app.use('/proctor', proctorRouter);

const headRouter = require('./headRoute');
app.use('/helloHead', headRouter);

const uploadRoute = require('./imageUpload');
app.use('/upload', uploadRoute);

function processLogout(req, res) {
  req.session.destroy();
  clearAllCookies(req, res);
  return true;
}

app.get('/logout/', (req, res) => {
  if (processLogout(req, res)) {
    const query = req.query;
    if (query.redirect) res.redirect(query.redirect);
    else res.send('Logout Success.');
  } else res.send('Something went wrong.');
});

app.post('/logout/', (req, res, next) => {
  if (processLogout(req, res)) {
    res.send({ msg: 'Logout Success.' });
  } else {
    next(
      createErr.InternalServerError(
        "Something went wrong.<br>Request couldn't be placed now.<br>Sorry for the inconvenience caused."
      )
    );
  }
});

const peerServer = ExpressPeerServer(httpServer, {
  path: '/',
  debug: isDev,
});
app.use('/peerjs', peerServer);
/**
rm -rf ./../exam-portal-backend/public/*
mv build/* ./../exam-portal-backend/public
 */
// mv ./public/index.html ./
const [indexHtmlPre, indexHtmlPost] = (() => {
  try {
    const html = fs.readFileSync('./index.html', 'utf8');
    const preHtmlEndIndex = html.indexOf('e">') + 3;
    const pre = html.slice(0, preHtmlEndIndex);
    return [pre, '</pre></body></html>'];
  } catch (err) {
    console.error('Error reading file:', err);
    throw new Error('Error reading index.html');
  }
})();

app.get('*', (req, res) => {
  const url = req._parsedUrl.pathname.toLowerCase();
  const param = req.query;
  let userInfo;
  if (url === '/testadmin' || url === '/monitor') {
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
  const secure = 'notBeingUsed';
  userInfo.token = secure;
  //
  res.send(`${indexHtmlPre}${JSON.stringify(userInfo)}${indexHtmlPost}`);
});
// Error out if no Router Exists
app.use(async (req, res, next) => {
  next(createErr.NotFound());
});
// Error Handeler Middleware
app.use((err, req, res, next) => {
  let showErr = err.message;
  if (showErr === 'invalid csrf token')
    showErr =
      'Security Token mis-match.<br>Refresh/Reload this Page to create a Secure Channel.';
  else if (err.name === 'MongoError') {
    showErr =
      "Something went wrong.<br>You request couldn't be fulfilled at the moment.<br>Please retry after sometime.";
    storeErr(req, err);
  }
  res
    .status(err.status || 500)
    .send({ error: { status: err.status || 500, message: showErr } });
});

process.env.TZ = 'Asia/Kolkata';

const socketConnectionParamObj = isDev
  ? {
      cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    }
  : {};
const io = require('socket.io')(httpServer, socketConnectionParamObj);

const { joinModel } = require('./helpers/schemaColl');

io.on('connection', (socket) => {
  // send socket connnection to invitation Route
  setSocketConn(io);
  setSocketCand(io);
  //
  socket.on('join-room', (roomId, data) => {
    // passcode is roomId
    socket.join(roomId);
    // If Candidate Joining
    if (roomId.search('_admin') === -1) {
      data.socketId = socket.id;
      joinModel.create(data, function (err, response) {
        if (err || !response) storeErr('', err);
        else if (response)
          socket.to(`${roomId}_admin`).emit('cand-connected', data);
      });
    } else socket.to(roomId).emit('newProctor', data);
  });
  socket.on('disconnect', () => {
    joinModel.findOneAndDelete({ socketId: socket.id }, (err, status) => {
      if (err) storeErr('', err);
      else if (status)
        socket.to(`${status.passcode}_admin`).emit('cand-disConnected', status);
    });
  });
  //
  socket.on('broadcastTest', (data) => {
    socket.to(data.passcode).emit('recBroadcast', data);
  });
  // Send to all in the Test client will check and close if it was their Proctor
  socket.on('proctorCloseAll', (obj) => {
    socket.to(obj.passcode).emit('closeAll', obj.peerId);
  });
  // Sent to specific in case remove from proctoring list
  socket.on('proctorClose', (obj) => {
    io.to(obj.socketId).emit('closeAll', obj.peerId);
  });
  //
  socket.on('closeMedia', (obj) => {
    io.to(obj.socketId).emit('closeMedia', obj.peerId);
  });
  //
  socket.on('endTest', (socketId, callback) => {
    callback({ done: true });
    io.to(socketId).emit('endTest');
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, function () {
  console.log(`Server Running on Port ${PORT}`);
});
