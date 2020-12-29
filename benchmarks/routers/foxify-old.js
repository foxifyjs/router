const Foxify = require("foxify");
const { routes, noop } = require("./common");

const app = new Foxify();

const router = new Foxify.Router();

routes.forEach((route) => {
  router.on(route.method, route.url, noop);
});

router.initialize(app);

module.exports = router;
