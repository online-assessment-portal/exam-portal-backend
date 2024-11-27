const crypto = require('crypto');

const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('Your SESSION_SECRET:', sessionSecret);

// node development/generateSessionSecret.js
