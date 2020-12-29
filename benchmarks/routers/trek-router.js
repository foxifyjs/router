const { routes, noop } = require("./common");
const Router = require("trek-router");

const router = new Router();

routes.forEach((route) => {
  router.add(route.method, route.url, noop);
});

module.exports = router;
