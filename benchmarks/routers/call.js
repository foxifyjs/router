const { routes, noop } = require("./common");
const { Router } = require("@hapi/call");

const router = new Router();

routes.forEach((route) => {
  router.add({ method: route.method.toLowerCase(), path: route.url }, noop);
});

module.exports = router;
