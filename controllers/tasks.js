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

router.get("/lists/:listId/tasks", authenticate, (req, res) => {
  // We want to return all tasks that belong to a specific list (specified by listId)
  Task.find({
    _listId: req.params.listId,
  }).then((tasks) => {
    res.send(tasks);
  });
});

router.post("/lists/:listId/tasks", authenticate, (req, res) => {
  // We want to create a new task in a list specified by listId

  List.findOne({
    _id: req.params.listId,
    _userId: req.user_id,
  })
    .then((list) => {
      if (list) {
        // list object with the specified conditions was found
        // therefore the currently authenticated user can create new tasks
        return true;
      }

      // else - the list object is undefined
      return false;
    })
    .then((canCreateTask) => {
      if (canCreateTask) {
        let newTask = new Task({
          title: req.body.title,
          _listId: req.params.listId,
        });
        newTask.save().then((newTaskDoc) => {
          res.send(newTaskDoc);
        });
      } else {
        res.sendStatus(404);
      }
    });
});

router.get("/lists/:listId/tasks/:taskId", (req, res) => {
  Task.findOne({
    _id: req.params.taskId,
    _listId: req.params.listId,
  }).then((task) => {
    res.send(task);
    console.log("i m in");
  });
});

router.patch("/lists/:listId/tasks/:taskId", authenticate, (req, res) => {
  // We want to update an existing task (specified by taskId)

  List.findOne({
    _id: req.params.listId,
    _userId: req.user_id,
  })
    .then((list) => {
      if (list) {
        // list object with the specified conditions was found
        // therefore the currently authenticated user can make updates to tasks within this list
        return true;
      }

      // else - the list object is undefined
      return false;
    })
    .then((canUpdateTasks) => {
      if (canUpdateTasks) {
        // the currently authenticated user can update tasks
        Task.findOneAndUpdate(
          {
            _id: req.params.taskId,
            _listId: req.params.listId,
          },
          {
            $set: req.body,
          }
        ).then(() => {
          res.send({ message: "Updated successfully." });
        });
      } else {
        res.sendStatus(404);
      }
    });
});

router.delete("/lists/:listId/tasks/:taskId", authenticate, (req, res) => {
  List.findOne({
    _id: req.params.listId,
    _userId: req.user_id,
  })
    .then((list) => {
      if (list) {
        // list object with the specified conditions was found
        // therefore the currently authenticated user can make updates to tasks within this list
        return true;
      }

      // else - the list object is undefined
      return false;
    })
    .then((canDeleteTasks) => {
      if (canDeleteTasks) {
        Task.findOneAndRemove({
          _id: req.params.taskId,
          _listId: req.params.listId,
        }).then((removedTaskDoc) => {
          res.send(removedTaskDoc);
        });
      } else {
        res.sendStatus(404);
      }
    });
});

//module exports
module.exports = router;
