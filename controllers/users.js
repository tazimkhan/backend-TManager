const router = require("express").Router();
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { List, Task, User } = require("../model/index.model");

//middleware setUp
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Verify Refresh Token Middleware (which will be verifying the session)
let verifySession = (req, res, next) => {
  // grab the refresh token from the request header
  let refreshToken = req.header("x-refresh-token");
  // grab the _id from the request header
  let _id = req.header("_id");
  User.findByIdAndToken(_id, refreshToken)
    .then((user) => {
      if (!user) {
        // user couldn't be found
        return Promise.reject({
          error:
            "User not found. Make sure that the refresh token and user id are correct",
        });
      }
      // if the code reaches here - the user was found
      // therefore the refresh token exists in the database - but we still have to check if it has expired or not
      req.user_id = user._id;
      req.userObject = user;
      req.refreshToken = refreshToken;
      let isSessionValid = false;
      user.sessions.forEach((session) => {
        if (session.token === refreshToken) {
          // check if the session has expired
          if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
            // refresh token has not expired
            isSessionValid = true;
          }
        }
      });
      if (isSessionValid) {
        // the session is VALID - call next() to continue with processing this web request
        next();
      } else {
        // the session is not valid
        return Promise.reject({
          error: "Refresh token has expired or the session is invalid",
        });
      }
    })
    .catch((e) => {
      res.status(401).send(e);
    });
};

/**
 * POST /users
 * Purpose: Sign up
 */
router.post("/users", (req, res) => {
  // User sign up

  let body = req.body;
  let newUser = new User(body);

  newUser
    .save()
    .then(() => {
      return newUser.createSession();
    })
    .then((refreshToken) => {
      // Session created successfully - refreshToken returned.
      // now we geneate an access auth token for the user

      return newUser.generateAccessAuthToken().then((accessToken) => {
        // access auth token generated successfully, now we return an object containing the auth tokens
        return { accessToken, refreshToken };
      });
    })
    .then((authTokens) => {
      // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
      res
        .header("x-refresh-token", authTokens.refreshToken)
        .header("x-access-token", authTokens.accessToken)
        .send(newUser);
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});
/**
 * POST /users/login
 * Purpose: Login
 */
router.post("/users/login", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  User.findByCredentials(email, password)
    .then((user) => {
      return user
        .createSession()
        .then((refreshToken) => {
          // Session created successfully - refreshToken returned.
          // now we geneate an access auth token for the user

          return user.generateAccessAuthToken().then((accessToken) => {
            // access auth token generated successfully, now we return an object containing the auth tokens
            return { accessToken, refreshToken };
          });
        })
        .then((authTokens) => {
          // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
          res
            .header("x-refresh-token", authTokens.refreshToken)
            .header("x-access-token", authTokens.accessToken)
            .send(user);
        });
    })
    .catch((e) => {
      if (e === "invalid email") {
        res.status(403).send("invalid email");
      } else {
        res.status(400).send("invalid Password");
      }
    });
});
/**
 * GET /users/me/access-token
 * Purpose: generates and returns an access token
 */
router.get("/users/me/access-token", verifySession, (req, res) => {
  // we know that the user/caller is authenticated and we have the user_id and user object available to us
  req.userObject
    .generateAccessAuthToken()
    .then((accessToken) => {
      res.header("x-access-token", accessToken).send({ accessToken });
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});

//module exports
module.exports = router;
