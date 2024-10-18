const { errMdl } = require("./schemaColl");
const cookieObj = { secure: true, httpOnly: true };
function storeErr(req, err) {
	try {
		const obj = {};
		if (typeof req === "string") obj.email = req;
		else {
			obj.userAgent = req.headers["user-agent"];
			obj.ip = req.headers["x-forwarded-for"] || req.ip;
			if (req.session && req.session.email) obj.email = req.session.email;
		}
		if (err && typeof err === "object") obj.error = err.stack.toString();
		else obj.error = err;
		errMdl.create(obj);
	} catch (error) {
		console.log(error);
	}
}
function clearAllCookies(req, res) {
	const clear = (allCookies) => {
		for (const key in allCookies) {
			if (key === "_csrf") continue;
			if (Object.hasOwnProperty.call(allCookies, key)) res.clearCookie(key);
		}
	};
	const cookies = req.cookies;
	clear(cookies);
	const signedCookies = req.signedCookies;
	clear(signedCookies);
}
//
function isAdminLogged(req, toReturn) {
	if (req.session.adminLogged) {
		const cookie = req.cookies;
		if (
			cookie &&
			cookie.uname &&
			cookie.org &&
			cookie.img &&
			cookie.key &&
			cookie.mailAcc
		) {
			if (toReturn === 1) {
				const obj = {
					loggedIn: true,
					adminUname: cookie.uname,
					org: cookie.org,
					img: cookie.img,
					imgUpKey: cookie.key,
					mailAcc: cookie.mailAcc,
				};
				return obj;
			} else if (toReturn === 2) return cookie.uname;
			else return true;
		} else return false;
	} else return false;
}
//
async function processSignIn(
	req,
	res,
	email,
	uname,
	name,
	img,
	isWhat = false
) {
	return new Promise((resolve) => {
		// isWhat false Credentials SignIn , 1 - Invitation SignIn , 2 - GoogleSignIn
		// Clear previous cookies if set
		clearAllCookies(req, res);
		res.cookie("uname", uname, cookieObj);
		res.cookie("name", name, cookieObj);
		res.cookie("img", img, cookieObj);
		if (isWhat === false) {
			req.session.regenerate(function (error) {
				if (error) {
					storeErr(req, error);
					resolve();
				} else {
					// Process SignIn
					req.session.loggedIn = true;
					req.session.email = email;
					const userInfo = {
						email: email,
						uname: uname,
						name: name,
						img: img ? img : "https://i.ibb.co/QpJYCQ7/UL8Ijh0w.png",
					};
					resolve(userInfo);
				}
			});
		} else {
			if (isWhat === 1)
				res.cookie("invReg", email, { ...cookieObj, signed: true });
			else if (isWhat === 2)
				res.cookie("gsign", email, { ...cookieObj, signed: true });
			req.session.destroy();
			resolve();
		}
	});
}
//
function isUserLogged(req, toReturn = false) {
	if (req.session.loggedIn) {
		const cookie = req.cookies;
		if (cookie) {
			if (toReturn === 1) {
				const obj = {
					loggedIn: true,
					email: req.session.email,
					uname: cookie.uname, // ? cookie.uname : ""
					name: cookie.name, // ? cookie.name : ""
					img: cookie.img,
				};
				return obj;
			} else if (toReturn === 2) return cookie.uname;
			else if (toReturn === 3) return req.session.email;
			else return true;
		} else return false;
	} else return false;
}
module.exports = {
	cookieObj,
	storeErr,
	clearAllCookies,
	isAdminLogged,
	processSignIn,
	isUserLogged,
};
