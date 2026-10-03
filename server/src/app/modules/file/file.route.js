const router = require("express").Router();
const auth = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/fileUploadMiddleware");
const controller = require("./file.controller");
const run = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
router.use(auth);
router.get("/", run(controller.list));
router.post("/", upload, run(controller.upload));
router.get("/:id/download", run(controller.download));
module.exports = router;
