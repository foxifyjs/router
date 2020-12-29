import Router from "../src";

it("should find match all route", () => {
  const router = new Router();

  const method = "GET";
  const handler = jest.fn();

  router.on(method, "/static/*file", handler);

  const params = {};

  const { handlers, allowHeader } = router.find(
    method,
    "/static/some/file.ext",
    params,
  );

  expect(handlers).toEqual([handler]);
  expect(allowHeader).toBe(method);
  expect(params).toEqual({ file: "some/file.ext" });
});
