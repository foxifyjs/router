const { routes, noop } = require("./common");
const router = require("express/lib/router")();

routes.forEach((route) => {
  if (route.method === "GET") {
    router.route(route.url).get(noop);
  } else {
    router.route(route.url).post(noop);
  }
});

module.exports = router;
