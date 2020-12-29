const { routes, noop } = require("./common");
const Router = require("koa-router");

const router = new Router();

routes.forEach((route) => {
  if (route.method === "GET") {
    router.get(
      route.url === "/static/*" ? /^\/static(?:\/|$)/ : route.url,
      noop,
    );
  } else {
    router.post(route.url, noop);
  }
});

module.exports = router;
