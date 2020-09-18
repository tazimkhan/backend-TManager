const mongoose = require("mongoose"); //it is connector which connect API to DB
const _ = require("loadsh"); //use for hide some details like password
const bcrypt = require("bcryptjs"); //used for password hashing
const jwt = require("jsonwebtoken"); //to generate a access token(15min approx expire)
const crypto = require("crypto"); //here crypto is genrate a random string.crypto used for data encryption and decryptions via HMAC,SHM512
// JWT Secret
const jwtSecret = "51778657346321226641fsdklafjasdkljfsklfjd7148924065";

//  Model
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    minlength: 1,
    trim: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  sessions: [
    {
      token: {
        type: String,
        required: true,
      },
      expiresAt: {
        type: Number,
        required: true,
      },
    },
  ],
});

// instance method which override the default JSON (bcs we can shear only email and _id (na ki password))
UserSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();
  // return the document except the password and sessions (these shouldn't be made available)
  return _.omit(userObject, ["password", "sessions"]);
};

/*first of all '''createSessions()=>{ then (helper methods 1) generateRefreshToken()
                                      then (hm 2) saveSessionsToDatabase()
                                      then (hm 3) generateRefreshTokenExpiryTime()
                                    }'''
                '''generateAccessAuthToken()'''
    when client side (user) register or login than first create sessions then generate access token
*/

UserSchema.methods.generateAccessAuthToken = function () {
  const user = this;
  return new Promise((resolve, reject) => {
    // Create the JSON Web Token and return that
    jwt.sign(
      { _id: user._id.toHexString() },
      jwtSecret,
      { expiresIn: "10m" },
      (err, token) => {
        if (!err) {
          resolve(token);
        } else {
          // there is an error
          reject();
        }
      }
    );
  });
};

/* (hm 1) HELPER METHODS */
UserSchema.methods.generateRefreshAuthToken = function () {
  // This method simply generates a 64byte hex string - it doesn't save it to the database. saveSessionToDatabase() does that.
  return new Promise((resolve, reject) => {
    crypto.randomBytes(64, (err, buf) => {
      if (!err) {
        // no error
        let token = buf.toString("hex");

        return resolve(token);
      } else {
        reject();
      }
    });
  });
};

/* (c2) HELPER METHODS */
let saveSessionToDatabase = (user, refreshToken) => {
  // Save session to database
  return new Promise((resolve, reject) => {
    let expiresAt = generateRefreshTokenExpiryTime();
    user.sessions.push({ token: refreshToken, expiresAt });
    user
      .save()
      .then(() => {
        // saved session successfully
        return resolve(refreshToken);
      })
      .catch((e) => {
        reject(e);
      });
  });
};

/* (c3) HELPER METHODS */
let generateRefreshTokenExpiryTime = () => {
  let daysUntilExpire = "10";
  let secondsUntilExpire = daysUntilExpire * 24 * 60 * 60;
  return Date.now() / 1000 + secondsUntilExpire;
};

UserSchema.methods.createSession = function () {
  let user = this;
  return user
    .generateRefreshAuthToken()
    .then((refreshToken) => {
      return saveSessionToDatabase(user, refreshToken);
    })
    .then((refreshToken) => {
      // saved to database successfully
      // now return the refresh token
      return refreshToken;
    })
    .catch((e) => {
      return Promise.reject("Failed to save session to database.\n" + e);
    });
};

/* MODEL METHODS (static methods) */
UserSchema.statics.getJWTSecret = () => {
  return jwtSecret;
};

UserSchema.statics.findByIdAndToken = function (_id, token) {
  // finds user by id and token
  // used in auth middleware (verifySession)
  const User = this;
  return User.findOne({
    _id,
    "sessions.token": token,
  });
};

UserSchema.statics.findByCredentials = function (email, password) {
  let User = this;
  return User.findOne({ email }).then((user) => {
    if (!user) return Promise.reject("invalid email");

    return new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          resolve(user);
        } else {
          reject("invalid Password");
        }
      });
    });
  });
};

UserSchema.statics.hasRefreshTokenExpired = (expiresAt) => {
  let secondsSinceEpoch = Date.now() / 1000;
  if (expiresAt > secondsSinceEpoch) {
    // hasn't expired
    return false;
  } else {
    // has expired
    return true;
  }
};

/* MIDDLEWARE */
// Before a user document is saved, this code runs
UserSchema.pre("save", function (next) {
  let user = this;
  let costFactor = 10;

  if (user.isModified("password")) {
    // if the password field has been edited/changed then run this code.

    // Generate salt and hash password
    bcrypt.genSalt(costFactor, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

const User = mongoose.model("User", UserSchema);

module.exports = { User };
