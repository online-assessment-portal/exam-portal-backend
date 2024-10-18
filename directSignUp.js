const mailer = require("./mailer");
//
const bcrypt = require("bcrypt");
const saltRounds = 10;
//
const { credentialsMdl } = require("./helpers/schemaColl");
//
function genRandomPass(email) {
	const signs = "@#%&";
	let pass =
		email.charAt(0).toUpperCase() + Math.random().toString(36).slice(-5);
	const rndmSign = signs.charAt(Math.floor(Math.random() * 4));
	const rndmNum = Math.floor(Math.random() * 9) + 1;
	const randLoc1 = Math.floor(Math.random() * 3) + 1;
	const randLoc2 = Math.floor(Math.random() * 3) + 1;
	pass = pass.slice(0, randLoc1) + rndmSign + pass.slice(randLoc1);
	pass = pass.slice(0, randLoc2) + rndmNum + pass.slice(randLoc2);
	return pass;
}
//
function directSignUp(req, email, googleId, reqType) {
	const randomPass = genRandomPass(email);
	return new Promise((res, rej) => {
		bcrypt.hash(randomPass, saltRounds).then((hashedPswd) => {
			if (hashedPswd) {
				const accData = {
					email: email,
					uname: email,
					password: hashedPswd,
					gId: googleId,
				};
				credentialsMdl
					.create(accData)
					.then((response) => {
						if (response) {
							const mailerObj = { pass: randomPass };
							if (googleId) mailerObj.isGSignIn = true;
							else mailerObj.isGSignIn = false;
							mailer.mailCreate(response.email, 0, mailerObj);
							res();
						} else {
							storeErr(req, `${reqType} Error - No Response`);
							rej();
						}
					})
					.catch((err) => {
						if (err) storeErr(req, err);
						else storeErr(req, `${reqType} Error - Catch No Err Obj`);
						rej();
					});
			} else {
				storeErr(req, `${reqType} Error - hash Password empty`);
				rej();
			}
		});
	});
}
module.exports = directSignUp;
