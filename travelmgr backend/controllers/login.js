const bcrypt = require('bcryptjs')
const loginRouter = require("express").Router();
const { User}  = require("../models/DBmodels");
const { SECRET } = require('../utils/config');

loginRouter.post("/", async (request, response) => {
  const { username, password } = request.body;
  console.log("username", username);
  const user = await User.findOne({ where: { username }  });
  const passwordCorrect =
    user === null ? false : await bcrypt.compare(password, user.passwordHash);

  if (!(user && passwordCorrect)) {
    return response.status(401).json({
      error: "invalid username or password",
    });
  }
  console.log("user", user);

  // check if the user is not disabled
  if (user.disabled) {
    return response.status(401).json({
      error: "login failed: user is disabled",
    });
  }

  const userForToken = {
    username: user.username,
    name: user.name,
    id: user.id,
  };
  request.session.isLoggedIn = true
  request.session.user = userForToken

  console.log("request.session", request.session)
  console.log("userForToken", userForToken);
  //const token = jwt.sign(userForToken, SECRET);

  response
    .status(200)
    .send({ id: user.id, username: user.username, name: user.name, email: user.email });
});

module.exports = loginRouter;
