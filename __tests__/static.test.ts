import Router from "../src";
import type { MethodT } from "@foxify/http";

it("should find index route", () => {
  const router = new Router();

  const method = "GET";
  const path = "/";
  const handler = jest.fn();

  router.on(method, path, handler);

  const params = {};

  const { handlers, allowHeader } = router.find(method, path, params);

  expect(handlers).toEqual([handler]);
  expect(allowHeader).toBe(method);
  expect(params).toEqual({});
});

it("should find long static route", () => {
  const router = new Router();

  const method = "GET";
  const path = "/very/deeply/nested/route/hello/there";
  const handler = jest.fn();

  router.on(method, path, handler);

  const params = {};

  const { handlers, allowHeader } = router.find(method, path, params);

  expect(handlers).toEqual([handler]);
  expect(allowHeader).toBe(method);
  expect(params).toEqual({});
});

it("should find short static route", () => {
  const router = new Router();

  const method = "GET";
  const path = "/user";
  const handler = jest.fn();

  router.on(method, path, handler);

  const params = {};

  const { handlers, allowHeader } = router.find(method, path, params);

  expect(handlers).toEqual([handler]);
  expect(allowHeader).toBe(method);
  expect(params).toEqual({});
});

it("should find static route same radix", () => {
  const router = new Router();

  const routes = [
    { method: "GET", url: "/user" },
    { method: "GET", url: "/user/comments" },
    { method: "GET", url: "/user/avatar" },
  ];
  const handler = jest.fn();

  routes.forEach(({ method, url }) =>
    router.on(method as MethodT, url, handler),
  );

  const params = {};

  const { handlers, allowHeader } = router.find(
    "GET",
    "/user/comments",
    params,
  );

  expect(handlers).toEqual([handler]);
  expect(allowHeader).toBe("GET");
  expect(params).toEqual({});
});

it("should fallback to the neighbor dynamic route", () => {
  const router = new Router();

  const routes = [
    { method: "GET", url: "/users/memes" },
    { method: "GET", url: "/users/:id" },
  ];
  const handler = jest.fn();

  routes.forEach(({ method, url }) =>
    router.on(method as MethodT, url, handler),
  );

  const params = {};

  const { handlers, allowHeader } = router.find("GET", "/users/me", params);

  expect(handlers).toEqual([handler]);
  expect(allowHeader).toBe("GET");
  expect(params).toEqual({ id: "me" });
});

it("should fallback to the neighbor match all route", () => {
  const router = new Router();

  const routes = [
    { method: "GET", url: "/users/memes" },
    { method: "GET", url: "/users/*" },
  ];
  const handler = jest.fn();

  routes.forEach(({ method, url }) =>
    router.on(method as MethodT, url, handler),
  );

  const params = {};

  const { handlers, allowHeader } = router.find("GET", "/users/me", params);

  expect(handlers).toEqual([handler]);
  expect(allowHeader).toBe("GET");
  expect(params).toEqual({ "*": "me" });
});

it("should fallback to the neighbor match all route and not the dynamic route", () => {
  const router = new Router();

  const routes = [
    { method: "GET", url: "/users/memes" },
    { method: "GET", url: "/users/:id" },
    { method: "GET", url: "/users/*" },
  ];
  const handler = jest.fn();

  routes.forEach(({ method, url }) =>
    router.on(method as MethodT, url, handler),
  );

  const params = {};

  const { handlers, allowHeader } = router.find(
    "GET",
    "/users/me/info",
    params,
  );

  expect(handlers).toEqual([handler]);
  expect(allowHeader).toBe("GET");
  expect(params).toEqual({ "*": "me/info" });
});

it("shouldn't find unregistered route", () => {
  const router = new Router();

  const method = "GET";
  const path = "/some/route";
  const handler = jest.fn();

  router.on(method, path, handler);

  const params = {};

  const { handlers, allowHeader } = router.find(
    method,
    "/some/other/route",
    params,
  );

  expect(handlers).toBeUndefined();
  expect(allowHeader).toBeUndefined();
  expect(params).toEqual({});
});
