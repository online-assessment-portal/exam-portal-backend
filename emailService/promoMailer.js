const { v4: uuidv4 } = require("uuid");
//
const { storeErr } = require("../helpers/common");
//
const { emailV } = require("../helpers/joiSchema");
const { sentMailMdl } = require("../helpers/schemaColl");
const { awsTransporter } = require("../aws_sesMailer");
//
function delay2Sec() {
	return new Promise((res) => {
		setTimeout(() => {
			res();
		}, 2000);
	});
}
//
function prepareAndSend(to) {
	return new Promise(async (resolve, reject) => {
		try {
			to = await emailV.validateAsync({ email: to });
			to = to.email;
		} catch (error) {
			storeErr(`Email Address Validation Failed Error ${to}`, error);
			reject();
		}
		const mailUID = uuidv4();
		const unsubUrl = `https://shredtest.cf/email/unsub/${to}/${mailUID}`;
		// Set new parameter value for mail Object
		mailObject.to = to;
		mailObject.html = body1 + unsubUrl + body2;
		mailObject.list.unsubscribe.url = unsubUrl;
		//
		try {
			const info = await awsTransporter.sendMail(mailObject);
			if (info.accepted[0] === to) {
				const store = { email: to, mailUID };
				sentMailMdl.create(store, (err, res) => {
					if (err || !res) {
						storeErr(
							"",
							`Sent Email store in DB Failed: ${JSON.stringify(store)}`
						);
						reject();
					} else resolve();
				});
			} else reject();
		} catch (err) {
			storeErr(
				`AWS Mail Error - ${err.code} - Sending to ${mailObject.to}`,
				err
			);
			reject();
		}
	});
}
// process Extracted Stack
async function processStack(stack) {
	const mailColl = [];
	stack.forEach((to) => {
		mailColl.push(prepareAndSend(to));
	});
	return Promise.all(mailColl);
}
// Function to regulate the email-Address List
async function regulateQueue(list) {
	// Extract a stack of 10
	const stack = list.splice(0, 2);
	if (stack.length)
		processStack(stack)
			.then(() => {
				delay2Sec().then(() => {
					regulateQueue(list);
				});
			})
			.catch(() =>
				storeErr(
					"",
					"Promise.all failure - not all mails were success at regulateQueue"
				)
			);
}
//
const fs = require("fs").promises;
//
let list = [],
	body1 = "",
	body2 = "",
	mailObject = {
		// from: "" - prepared at main function,
		subject: "Free Online Examination Portal",
		replyTo: '"Customer Care" <contact@shredtest.cf>',
		// to: "", - set at prepare mail
		// html: "", - set at prepare mail
		text: "Your browser or app does not support this mail. Open it in updated browser / App",
		list: {
			unsubscribe: {
				// url: "", - set at prepare mail
				comment: "unsublinking",
			},
		},
	};
async function main(param) {
	list = [];
	body1 = "";
	body2 = "";
	// Read html body from file
	try {
		await Promise.all([
			fs.readFile("./emailService/mailList.txt", "utf8"),
			fs.readFile("./emailService/body1.txt", "utf8"),
			fs.readFile("./emailService/body2.txt", "utf8"),
		])
			.then((val) => {
				list = val[0].split(",");
				body1 = val[1];
				body2 = val[2];
			})
			.catch(() => {
				throw new Error("Error Reading File");
			});
	} catch (error) {
		return error.message;
	}
	if (!(body1 && body2)) return "Empty Body";
	else if (!list.length) return "Mailing List is Empty";
	else {
		mailObject.from = `"${param.frm}" <${param.frmMail}@shredtest.cf>`;
		regulateQueue(list);
		// console.log(list.length);
		return "Process Initiated";
	}
}
module.exports = main;
