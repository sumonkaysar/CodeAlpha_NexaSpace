const router = require("express").Router();
const auth = require("../../middlewares/authMiddleware");
const controller = require("./room.controller");
const run = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
router.use(auth);
router.get("/", run(controller.list));
router.post("/", run(controller.create));
router.get("/:id", run(controller.get));
router.post("/:id/join", run(controller.join));
router.delete("/:id", run(controller.remove));
module.exports = router;
