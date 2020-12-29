const { createStream } = require("table");
const { Suite } = require("benchmark");
const {
  foxify,
  foxifyOld,
  call,
  express,
  findMyWay,
  koaRouter,
  koaTreeRouter,
  trekRouter,
} = require("./routers");
const { noop } = require("./routers/common");

const stream = createStream({
  columnDefault: {
    alignment: "center",
    width: 20,
  },
  columnCount: 5,
});

let base;

new Suite()
  .add("@foxify/router", () => {
    foxify.find("GET", "/user");
    foxify.find("GET", "/user/comments");
    foxify.find("GET", "/user/lookup/username/john");
    foxify.find("GET", "/event/abcd1234/comments");
    foxify.find("GET", "/very/deeply/nested/route/hello/there");
    foxify.find("GET", "/static/index.html");
  })
  .add("foxify (v0.10.20)", () => {
    foxifyOld.find("GET", "/user");
    foxifyOld.find("GET", "/user/comments");
    foxifyOld.find("GET", "/user/lookup/username/john");
    foxifyOld.find("GET", "/event/abcd1234/comments");
    foxifyOld.find("GET", "/very/deeply/nested/route/hello/there");
    foxifyOld.find("GET", "/static/index.html");
  })
  .add("@hapi/call", () => {
    call.route("get", "/user");
    call.route("get", "/user/comments");
    call.route("get", "/user/lookup/username/john");
    call.route("get", "/event/abcd1234/comments");
    call.route("get", "/very/deeply/nested/route/hello/there");
    call.route("get", "/static/index.html");
  })
  .add("express", () => {
    express.handle({ method: "GET", url: "/user" });
    express.handle({ method: "GET", url: "/user/comments" });
    express.handle({ method: "GET", url: "/user/lookup/username/john" });
    express.handle(
      { method: "GET", url: "/event/abcd1234/comments" },
      null,
      noop,
    );
    express.handle(
      { method: "GET", url: "/very/deeply/nested/route/hello/there" },
      null,
      noop,
    );
    express.handle({ method: "GET", url: "/static/index.html" }, null, noop);
  })
  .add("find-my-way", () => {
    findMyWay.find("GET", "/user");
    findMyWay.find("GET", "/user/comments");
    findMyWay.find("GET", "/user/lookup/username/john");
    findMyWay.find("GET", "/event/abcd1234/comments");
    findMyWay.find("GET", "/very/deeply/nested/route/hello/there");
    findMyWay.find("GET", "/static/index.html");
  })
  .add("koa-router", () => {
    koaRouter.match("/user", "GET");
    koaRouter.match("/user/comments", "GET");
    koaRouter.match("/user/lookup/username/john", "GET");
    koaRouter.match("/event/abcd1234/comments", "GET");
    koaRouter.match("/very/deeply/nested/route/hello/there", "GET");
    koaRouter.match("/static/index.html", "GET");
  })
  .add("koa-tree-router", () => {
    koaTreeRouter.find("GET", "/user");
    koaTreeRouter.find("GET", "/user/comments");
    koaTreeRouter.find("GET", "/user/lookup/username/john");
    koaTreeRouter.find("GET", "/event/abcd1234/comments");
    koaTreeRouter.find("GET", "/very/deeply/nested/route/hello/there");
    koaTreeRouter.find("GET", "/static/index.html");
  })
  .add("trek-router", () => {
    trekRouter.find("GET", "/user");
    trekRouter.find("GET", "/user/comments");
    trekRouter.find("GET", "/user/lookup/username/john");
    trekRouter.find("GET", "/event/abcd1234/comments");
    trekRouter.find("GET", "/very/deeply/nested/route/hello/there");
    trekRouter.find("GET", "/static/index.html");
  })
  .on("cycle", (e) => {
    const { name, hz, stats } = e.target;

    if (name === "@foxify/router") base = hz;

    const size = stats.sample.length;

    stream.write([
      name,
      `${hz.toLocaleString("en-US", {
        maximumFractionDigits: hz < 100 ? 2 : 0,
      })} ops/sec`,
      (hz / base).toLocaleString("en-US", {
        style: "percent",
        maximumFractionDigits: 2,
      }),
      `\xb1${stats.rme.toLocaleString("en-US", {
        maximumFractionDigits: 2,
      })}%`,
      `${size} run${size === 1 ? "" : "s"} sampled`,
    ]);
  })
  .on("complete", function onComplete() {
    console.log("\n> Fastest is %s", this.filter("fastest").map("name"));
  })
  .run();
