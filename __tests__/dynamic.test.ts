import Router from "../src";
import { MethodT } from "@foxify/http";

it("should find dynamic route", () => {
  const router = new Router();

  const method = "GET";
  const handler = jest.fn();

  router.on(method, "/user/lookup/username/:username", handler);

  const params = {};

  const { handlers, allowHeader } = router.find(
    method,
    "/user/lookup/username/ardalan",
    params,
  );

  expect(handlers).toEqual([handler]);
  expect(allowHeader).toBe(method);
  expect(params).toEqual({ username: "ardalan" });
});

it("should find mixed dynamic/static route", () => {
  const router = new Router();

  const method = "GET";
  const handler = jest.fn();

  router.on(method, "event/:id/comments", handler);

  const params = {};

  const { handlers, allowHeader } = router.find(
    method,
    "event/abcd1234/comments",
    params,
  );

  expect(handlers).toEqual([handler]);
  expect(allowHeader).toBe(method);
  expect(params).toEqual({ id: "abcd1234" });
});

it("should fallback to the neighbor match all route", () => {
  const router = new Router();

  const routes = [
    { method: "GET", url: "/event/:id/comments" },
    { method: "GET", url: "/event/*" },
    { method: "GET", url: "/*" },
  ];
  const handler = jest.fn();

  routes.forEach(({ method, url }) =>
    router.on(method as MethodT, url, handler),
  );

  const params = {};

  const { handlers, allowHeader } = router.find(
    "GET",
    "/event/some/route",
    params,
  );

  expect(handlers).toEqual([handler]);
  expect(allowHeader).toBe("GET");
  expect(params).toEqual({ "*": "some/route" });
});

it("shouldn't find unregistered route", () => {
  const router = new Router();

  const method = "GET";
  const handler = jest.fn();

  router.on(method, "event/:id", handler);

  const params = {};

  const { handlers, allowHeader } = router.find(
    method,
    "event/abcd1234/comments",
    params,
  );

  expect(handlers).toBeUndefined();
  expect(allowHeader).toBeUndefined();
  expect(params).toEqual({});
});
