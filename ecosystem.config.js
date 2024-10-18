module.exports = {
	apps: [
		{
			name: "examServer_PM2",
			script: "examServer.js",
			watch: false,
			instances: 0,
			exec_mode: "cluster",
			instance_var: "INSTANCE_ID",
			increment_var: "PORT",
			env: { PORT: 3000, NODE_ENV: "development" },
		},
	],
};
