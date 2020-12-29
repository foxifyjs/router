const { routes, noop } = require("./common");
const Router = require("../..").default;

const router = new Router();

routes.forEach((route) => {
  router.on(route.method, route.url, noop);
});

module.exports = router;
