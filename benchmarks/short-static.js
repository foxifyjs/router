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

const stream = createStream({
  columnDefault: {
    alignment: "center",
    width: 20,
  },
  columnCount: 5,
});

let base;

const PATH = "/user";

new Suite()
  .add("@foxify/router", () => {
    foxify.find("GET", PATH);
  })
  .add("foxify (v0.10.20)", () => {
    foxifyOld.find("GET", PATH);
  })
  .add("@hapi/call", () => {
    call.route("get", PATH);
  })
  .add("express", () => {
    express.handle({ method: "GET", url: PATH });
  })
  .add("find-my-way", () => {
    findMyWay.find("GET", PATH);
  })
  .add("koa-router", () => {
    koaRouter.match(PATH, "GET");
  })
  .add("koa-tree-router", () => {
    koaTreeRouter.find("GET", PATH);
  })
  .add("trek-router", () => {
    trekRouter.find("GET", PATH);
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
