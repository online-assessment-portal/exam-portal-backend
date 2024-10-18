const Joi = require("joi");
const tokenSch = { _csrf: Joi.string().min(10).max(100).trim().required() };
const unamSchReq = {
	uname: Joi.string().min(3).max(60).trim().required(),
};
const emailSch = {
	email: Joi.string()
		.min(3)
		.max(60)
		.lowercase()
		.trim()
		.email({ tlds: { allow: ["com", "in", "edu", "net"] } })
		.required(),
};
const emailV = Joi.object(emailSch);
const otpSch = { otp: Joi.number().integer().required() };
//
const otpEmailV = Joi.object({
	...emailSch,
	isReset: Joi.boolean(),
	...tokenSch,
});
const otpV = Joi.object({
	...emailSch,
	...otpSch,
	isReset: Joi.boolean(),
	...tokenSch,
});
//
const pswdSch = {
	password: Joi.string()
		.min(6)
		.max(16)
		.trim()
		.pattern(
			/^(?=.*[A-Z])(?=.*[a-z])(?=.*[\d])(?=.*[\W|_])[a-zA-Z0-9!@#$%^&*]{6,16}$/
		)
		.required()
		.messages({
			"string.pattern.base": "Password Validation Error : Invalid Format",
		}),
};
const pswdV = Joi.object(pswdSch);
//
const signInV = Joi.object({
	...unamSchReq,
	...pswdSch,
	...tokenSch,
});
const registerAccV = Joi.object({
	...pswdSch,
	isReset: Joi.boolean(),
	...tokenSch,
});
const registerGglV = Joi.object({
	...emailSch,
	gId: Joi.string().alphanum().max(150).required(),
});
const profileV = Joi.object({
	uname: Joi.string().alphanum().min(6).max(15).trim().required().messages({
		"string.alphanum":
			"your username can contain alphanumeric characters only.<br>No white-spaces nor any special characters is allowed.<br>it can only be any combination of alphabets and numbers",
	}),
	name: Joi.string().min(5).max(30).trim().required(),
	sendCand: Joi.boolean().required(),
	...tokenSch,
});
// For Exam Admin
const adminAuth = Joi.object({
	...unamSchReq,
	...pswdSch,
	...tokenSch,
});
const qBankJoi = Joi.object({
	passcode: Joi.string().alphanum().min(9).max(10).trim().required(),
	strtTime: Joi.date().iso().required(),
	endTime: Joi.date().iso().required(),
	open: Joi.boolean().required(),
	isFixedDur: Joi.boolean().required(),
	dur: Joi.string().alphanum().max(10).trim().required(),
	testInfo: Joi.string().max(2000).trim().required(),
	qBank: Joi.string().max(25000).trim().required(),
	crctOpt: Joi.string().max(1000).trim().required(),
	isUpdt: Joi.boolean().required(),
	...tokenSch,
});
const passcodeSch = {
	passcode: Joi.string()
		.alphanum()
		.min(9)
		.max(10)
		.trim()
		.uppercase()
		.required()
		.messages({
			String:
				"Passcode is missing.<br>Passcode is the key which uniquely identifies each test.<br>Request couldn't be placed without Passcode.",
		}),
};
const passcodeV = Joi.object({ ...passcodeSch, ...tokenSch });
//
const uploadResV = Joi.object({
	...passcodeSch,
	mailList: Joi.string().max(60000).trim().required(),
	scrDet: Joi.string().max(30000).trim().required(),
	total: Joi.string().max(3000).trim().required(),
	negMark: Joi.string().max(2000).trim().required(),
	eMarks: Joi.string().max(10000).trim().required(),
	eCmnts: Joi.string().max(50000).trim().required(),
	finalScore: Joi.string().max(50000).trim().required(),
	...tokenSch,
});
//
const getResultStrV = Joi.object({
	mailList: Joi.string().max(50000).trim().required(),
	...tokenSch,
});
//
const uploadRankV = Joi.object({
	...passcodeSch,
	spms: Joi.string().max(100000).trim().required(),
	fsRank: Joi.string().max(100000).trim().required(),
	...tokenSch,
});
//
const excelDnV = Joi.object({
	html: Joi.string().max(1000000).trim().required(),
	...tokenSch,
});
//
const showResV = Joi.object({
	// ...passcodeSch,
	mailList: Joi.string().max(100000).trim().required(),
	showResData: Joi.string().max(100000).trim().required(),
	...tokenSch,
});
//
const inviteMailV = Joi.object({
	...passcodeSch,
	from: Joi.string()
		.min(3)
		.max(60)
		.lowercase()
		.trim()
		.email({ tlds: { allow: ["com", "in", "edu", "net", "cf"] } }),
	sender: Joi.string().max(50).trim().required(),
	token: Joi.string().max(120).trim().allow(null, ""),
	mailBody: Joi.string().max(10000).trim().required(),
	mailSub: Joi.string().max(250).trim().required(),
	myHold: Joi.string().max(50).trim().required(),
	queue: Joi.string().max(50000).trim().required(),
	...tokenSch,
});
//
const inviteAuthObj = {
	...passcodeSch,
	myAuthHash: Joi.string().alphanum().min(3).max(30).trim().required(),
	...emailSch,
};
const inviteAuthV = Joi.object(inviteAuthObj);
//
const unSubObj = {
	...inviteAuthObj,
	sender: Joi.string().min(3).max(60).trim().required(),
	type: Joi.string().max(5).trim().required(),
};
const inviteUnSubV = Joi.object(unSubObj);
//
const invMailAcc = Joi.object({
	name: Joi.string().max(50).trim().required(),
	...emailSch,
	token: Joi.string().max(120).trim().required(),
	...tokenSch,
});
// Candidate
const libSelV = Joi.object({
	...passcodeSch,
	libSel: Joi.string().max(1500).trim().required(),
	...tokenSch,
});
//
const qsnrV = Joi.object({
	...passcodeSch,
	response: Joi.string().max(1500).trim().required(),
	...tokenSch,
});
//
const submitTestV = Joi.object({
	...passcodeSch,
	crntSec: Joi.number().integer().required(),
	response: Joi.string().trim().required(),
	status: Joi.string().trim().required(),
	tcResponse: Joi.string().trim().required(),
	cdLangId: Joi.string().trim().required(),
	vData: Joi.string().trim(),
	sSize: Joi.string().trim(),
	...tokenSch,
});
//
const compilerV = Joi.object({
	resource: Joi.string().max(10000).trim().required(),
	target: Joi.number().integer().required(),
	useflow: Joi.number().integer().required(),
	fordata: Joi.string().min(0).max(2000).trim().allow(null, ""),
	...tokenSch,
});
//
const feedbackV = Joi.object({
	...passcodeSch,
	feedback: Joi.string().max(1000).trim(),
	...tokenSch,
});
//
const addAdminV = Joi.object({
	...unamSchReq,
	...emailSch,
	...pswdSch,
	org: Joi.string().min(5).max(30).required(),
	img: Joi.string().min(10).max(60).required(),
	imgUpKey: Joi.string().min(3).max(100).required(),
	...tokenSch,
});
//
const contactV = Joi.object({
	name: Joi.string().empty("").max(50).trim(),
	mailId: Joi.string().empty("").max(100).lowercase().trim(),
	mobNo: Joi.string().empty("").max(10).trim(),
	msg: Joi.string().empty("").max(500).trim(),
	...tokenSch,
});
// Email Unsubscribe
const emailUnSubV = Joi.object({
	...emailSch,
	action: Joi.string().min(1).max(10).trim().required(),
	mailUID: Joi.string().min(20).max(50).trim().required(),
});
module.exports = {
	otpEmailV,
	otpV,
	registerAccV,
	pswdV,
	signInV,
	registerGglV,
	profileV,
	adminAuth,
	qBankJoi,
	passcodeV,
	uploadResV,
	getResultStrV,
	uploadRankV,
	excelDnV,
	showResV,
	invMailAcc,
	inviteMailV,
	emailV,
	inviteAuthV,
	inviteUnSubV,
	//
	libSelV,
	qsnrV,
	submitTestV,
	compilerV,
	feedbackV,
	//
	addAdminV,
	contactV,
	//
	emailUnSubV,
};
