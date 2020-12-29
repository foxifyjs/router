const { routes, noop } = require("./common");
const router = require("find-my-way")();

routes.forEach((route) => {
  router.on(route.method, route.url, noop);
});

module.exports = router;
