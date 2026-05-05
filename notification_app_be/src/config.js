const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

module.exports = {
  port: process.env.PORT || 5000,
  evalServiceUrl: process.env.EVAL_SERVICE_URL || "http://20.207.122.201/evaluation-service",
  auth: {
    email: process.env.AUTH_EMAIL,
    name: process.env.AUTH_NAME,
    rollNo: process.env.AUTH_ROLL_NO,
    accessCode: process.env.AUTH_ACCESS_CODE,
    clientID: process.env.AUTH_CLIENT_ID,
    clientSecret: process.env.AUTH_CLIENT_SECRET,
  },
};
