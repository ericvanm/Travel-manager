
const logoutRouter = require("express").Router();


logoutRouter.delete("/", async (request, response) => {
  console.log("logout entering");
  request.session.destroy((err) => {
    if (err) {
      console.log(err);
    } else {
      console.log("logout successful");
      response.status(200).send("OK");
    }
  });
});

module.exports = logoutRouter;
