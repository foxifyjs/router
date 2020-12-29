const { routes, noop } = require("./common");
const Router = require("koa-tree-router");

const router = new Router();

routes.forEach((route) => {
  router.on(
    route.method,
    route.url === "/static/*" ? "/static/*file" : route.url,
    noop,
  );
});

module.exports = router;
