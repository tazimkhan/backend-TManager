const router = require("express").Router();
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
//const bcrypt = require('bcryptjs'); //for hashPassword
//const { check, validationResult } = require('express-validator');//for validation
const { List, Task, User } = require("../model/index.model");

//middleware setUp
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// check whether the request has a valid JWT access token
let authenticate = (req, res, next) => {
  let token = req.header("x-access-token");
  // verify the JWT
  jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
    if (err) {
      // there was an error
      // jwt is invalid - * DO NOT AUTHENTICATE *
      res.status(401).send(err);
    } else {
      // jwt is valid
      req.user_id = decoded._id;
      next();
    }
  });
};
/* ROUTE HANDLERS */

/* LIST ROUTES */

/*
 * GET /lists
 * Purpose: Get all lists
 */
router.get("/lists", authenticate, (req, res) => {
  // We want to return an array of all the lists that belong to the authenticated user
  List.find({
    _userId: req.user_id,
  })
    .then((lists) => {
      res.send(lists);
    })
    .catch((e) => {
      res.send(e);
    });
});

router.post("/lists", authenticate, function (req, res) {
  let title = req.body.title;
  let newList = new List({ title, _userId: req.user_id });
  newList.save().then((listDoc) => {
    res.send(listDoc);
  });
});

router.patch("/lists/:id", authenticate, function (req, res) {
  List.findOneAndUpdate(
    { _id: req.params.id, _userId: req.user_id },
    { $set: req.body }
  ).then(() => {
    res.send({ message: "update successfully" });
  });
});

router.delete("/lists/:id", authenticate, function (req, res) {
  List.findOneAndRemove({
    _id: req.params.id,
    _userId: req.user_id,
  }).then((removedListDoc) => {
    res.send(removedListDoc);
    // delete also all the taks under this list
    deleteTaskFromList(removedListDoc._id);
  });
});

//helper method for delete all task when delete a list
let deleteTaskFromList = (_listId) => {
  Task.deleteMany({ _listId }).then(() => {
    console.log("Tasks from" + _listId + "were deleted");
  });
};
//module exports
module.exports = router;
