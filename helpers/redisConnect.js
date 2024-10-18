const redis = require("redis");
const redisClient = redis.createClient({
	port: 6379,
	host: "127.0.0.1",
});
//
redisClient.on("connect", () => {
	console.log("Redis Connected");
});
redisClient.on("ready", () => {
	console.log("Redis Ready to be Used");
});
redisClient.on("error", (err) => {
	console.log(" Error " + err);
});
redisClient.on("end", () => {
	console.log("Redis Client Disconnected");
});
//
process.on("SIGINT", () => {
	redisClient.quit();
});
//
module.exports = redisClient;
