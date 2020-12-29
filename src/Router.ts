import {
  HttpError,
  MethodNotAllowed,
  NotFound,
  STATUS,
  StatusT,
} from "@foxify/http";
import assert from "assert";
import escapeHtml from "escape-html";
import { STATUS_CODES } from "http";
import { compact, deepFlatten } from "prototyped.js/es6/array/methods";
import {
  EMPTY_RESULT,
  ErrorHandlersT,
  ErrorHandlerT,
  HandlersResultT,
  HandlersT,
  HandlerT,
  METHODS,
  MethodT,
  MiddlewaresT,
  NextT,
  NODE,
  ParamHandlerI,
  RequestT,
  ResponseT,
  RouteMethodsT,
  RoutesT,
  ShortHandRoute,
} from "./constants";
import Node from "./Node";
import { prettyPrint, routes } from "./utils";

interface Router<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> {
  acl: ShortHandRoute<Request, Response, this>;
  bind: ShortHandRoute<Request, Response, this>;
  checkout: ShortHandRoute<Request, Response, this>;
  connect: ShortHandRoute<Request, Response, this>;
  copy: ShortHandRoute<Request, Response, this>;
  delete: ShortHandRoute<Request, Response, this>;
  get: ShortHandRoute<Request, Response, this>;
  head: ShortHandRoute<Request, Response, this>;
  link: ShortHandRoute<Request, Response, this>;
  lock: ShortHandRoute<Request, Response, this>;
  "m-search": ShortHandRoute<Request, Response, this>;
  merge: ShortHandRoute<Request, Response, this>;
  mkactivity: ShortHandRoute<Request, Response, this>;
  mkcalendar: ShortHandRoute<Request, Response, this>;
  mkcol: ShortHandRoute<Request, Response, this>;
  move: ShortHandRoute<Request, Response, this>;
  notify: ShortHandRoute<Request, Response, this>;
  options: ShortHandRoute<Request, Response, this>;
  patch: ShortHandRoute<Request, Response, this>;
  post: ShortHandRoute<Request, Response, this>;
  pri: ShortHandRoute<Request, Response, this>;
  propfind: ShortHandRoute<Request, Response, this>;
  proppatch: ShortHandRoute<Request, Response, this>;
  purge: ShortHandRoute<Request, Response, this>;
  put: ShortHandRoute<Request, Response, this>;
  rebind: ShortHandRoute<Request, Response, this>;
  report: ShortHandRoute<Request, Response, this>;
  search: ShortHandRoute<Request, Response, this>;
  source: ShortHandRoute<Request, Response, this>;
  subscribe: ShortHandRoute<Request, Response, this>;
  trace: ShortHandRoute<Request, Response, this>;
  unbind: ShortHandRoute<Request, Response, this>;
  unlink: ShortHandRoute<Request, Response, this>;
  unlock: ShortHandRoute<Request, Response, this>;
  unsubscribe: ShortHandRoute<Request, Response, this>;
}

class Router<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> {
  protected readonly tree = new Node<Request, Response>();

  protected readonly paramHandlers: ParamHandlerI<Request, Response> = {};

  protected middlewares: HandlerT<Request, Response>[] = [];

  protected catchers: ErrorHandlerT<Request, Response>[] = [];

  public constructor(protected readonly prefix = "/") {}

  public lookup(request: Request, response: Response): void {
    const { method, path, params } = request;

    const { handlers = [], allowHeader = "" } = this.find(method, path, params);

    const next = this.generateNext(request, response, allowHeader, handlers);

    response.next = next;

    if (allowHeader !== "") response.setHeader("Allow", allowHeader);

    next();
  }

  public find(
    method: MethodT,
    path: string,
    params: Record<string, unknown> = {},
  ): Partial<HandlersResultT<Request, Response>> {
    let node: Node<Request, Response> | undefined = this.tree;

    if (path[0] === "/") {
      if (path.length === 1) {
        return node.findHandlers(method);
      }

      path = path.slice(1);
    }

    let currentNode = node;
    node = currentNode.findChild(path);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (node === undefined) return EMPTY_RESULT;

      switch (node.type) {
        default:
        case NODE.STATIC: {
          const { prefix, prefixLength, childrenCount } = node;

          if (path.length > prefixLength) {
            if (childrenCount > 0 && path.slice(0, prefixLength) === prefix) {
              path = path.slice(prefixLength);

              currentNode = node;
              node = currentNode.findChild(path);

              continue;
            }
          } else if (prefix === path) {
            return node.findHandlers(method);
          }

          node = currentNode.findChildByLabel(":");

          if (node === undefined) {
            node = currentNode.findChildByLabel("*");

            continue;
          }
        }
        case NODE.PARAM: {
          const { childrenCount, param } = node;

          const slashIndex = path.indexOf("/");

          if (slashIndex === -1) {
            params[param!] = path;

            return node.findHandlers(method);
          }

          if (childrenCount > 0) {
            params[param!] = path.slice(0, slashIndex);

            path = path.slice(slashIndex);

            currentNode = node;
            node = currentNode.findChild(path);

            continue;
          }

          node = currentNode.findChildByLabel("*");

          if (node === undefined) return EMPTY_RESULT;
        }
        case NODE.MATCH_ALL: {
          const { param } = node;

          params[param!] = path;

          return node.findHandlers(method);
        }
      }
    }
  }

  public catch(...handlers: ErrorHandlersT<Request, Response>): this {
    handlers = compact(deepFlatten(handlers));

    if (handlers.length === 0) return this;

    this.catchers = this.catchers.concat(
      handlers as ErrorHandlerT<Request, Response>[],
    );

    return this;
  }

  public use(...handlers: MiddlewaresT<Request, Response>): this {
    handlers = compact(deepFlatten(handlers));

    if (handlers.length === 0) return this;

    const routers: Router<Request, Response>[] = handlers.filter(
      (handler) => handler instanceof Router,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    for (const router of routers) {
      const routes = router.routes();

      for (const [method, path, handlers] of routes) {
        this.on(method, path, handlers);
      }
    }

    const middlewares: HandlerT<Request, Response>[] = handlers.filter(
      (handler) => !(handler instanceof Router),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    if (middlewares.length > 0) {
      this.middlewares = this.middlewares.concat(middlewares);
    }

    return this;
  }

  public param(name: string, handler: HandlerT<Request, Response>): this {
    const { paramHandlers } = this;

    assert(paramHandlers[name] === undefined);

    paramHandlers[name] = handler;

    return this;
  }

  public all(path: string, ...handlers: HandlersT<Request, Response>): this {
    return this.on(METHODS, path, handlers);
  }

  public route(path: string): RouteMethodsT<Request, Response> {
    const ROUTER = METHODS.reduce((router, method) => {
      const name = method.toLowerCase() as Lowercase<MethodT>;

      router[name] = (...handlers: HandlersT<Request, Response>) => {
        this.on(method, path, handlers);

        return ROUTER;
      };

      return router;
    }, {} as RouteMethodsT<Request, Response>);

    return ROUTER;
  }

  public on(
    methods: MethodT[],
    path: string,
    ...handlers: HandlersT<Request, Response>
  ): this;
  public on(
    method: MethodT,
    path: string,
    ...handlers: HandlersT<Request, Response>
  ): this;
  public on(
    method: MethodT | MethodT[],
    path: string,
    ...handlers: HandlersT<Request, Response>
  ): this {
    if (Array.isArray(method)) {
      for (const item of method) this.on(item, path, handlers);

      return this;
    }

    handlers = compact(deepFlatten(handlers));

    if (handlers.length === 0) return this;

    const { prefix: routerPrefix, middlewares, paramHandlers } = this;

    path = `${routerPrefix}${path}`.replace(/\/{2,}/g, "/");

    if (path[0] === "/") path = path.slice(1);

    const params: string[] = [];

    let node: Node<Request, Response> | undefined = this.tree;

    let currentNode: Node<Request, Response>;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (path.length === 0) {
        for (const param of params) {
          const paramHandler = paramHandlers[param];

          if (paramHandler !== undefined)
            handlers = [paramHandler, ...handlers];
        }

        node.addHandlers(
          method,
          middlewares.concat(handlers as HandlerT<Request, Response>[]),
        );

        return this;
      }

      currentNode = node;

      node = currentNode.findChildByLabel(path[0]);

      if (node === undefined) {
        let paramIndex = path.indexOf(":");

        if (paramIndex === -1) paramIndex = path.indexOf("*");

        if (paramIndex !== -1) {
          if (paramIndex > 0) {
            node = currentNode.addChild(path.slice(0, paramIndex));

            params.push(node.param!);

            path = path.slice(paramIndex);

            continue;
          }

          const slashIndex = path.indexOf("/");

          if (slashIndex > 0) {
            node = currentNode.addChild(path.slice(0, slashIndex));

            params.push(node.param!);

            path = path.slice(slashIndex);

            continue;
          }
        }

        node = currentNode.addChild(path);

        params.push(node.param!);

        path = "";

        continue;
      }

      const { prefix, prefixLength } = node;

      const pathLength = path.length;

      const max = pathLength < prefixLength ? pathLength : prefixLength;

      let length = 0;
      while (length < max && path[length] === prefix[length]) length++;

      if (prefix[0] === ":" || prefix[0] === "*") {
        if (length !== prefixLength) {
          throw new Error("Can't assign multiple names to the same parameter");
        }

        params.push(node.param!);

        path = path.slice(length);

        continue;
      }

      if (length < prefixLength) {
        const subNode = currentNode.addChild(prefix.slice(0, length));

        node.resetLabel(prefix.slice(length));

        subNode.addChild(node);

        node = subNode;

        path = path.slice(length);

        continue;
      }

      if (length < pathLength) {
        path = path.slice(length);

        continue;
      }

      path = "";
    }
  }

  /**
   * Returns visual representation of tree nodes
   */
  public prettyPrint(): string {
    return prettyPrint(this.tree, "", true);
  }

  protected generateNext(
    req: Request,
    res: Response,
    allowHeader: string,
    handlers: HandlerT<Request, Response>[] = [],
  ): NextT {
    const length = handlers.length;
    let index = 0;

    const next = (error?: Error) => {
      if (error) return this.throw(error, req, res);

      if (index === length) {
        if (allowHeader.length > 0) {
          return this.throw(new MethodNotAllowed(), req, res);
        }

        return this.throw(new NotFound(), req, res);
      }

      try {
        const result = handlers[index++](req, res, next);

        if (result instanceof Promise) {
          result.catch((error) => this.throw(error, req, res));
        }
      } catch (error) {
        this.throw(error, req, res);
      }
    };

    return next;
  }

  protected throw(error: Error, request: Request, response: Response): void {
    const { catchers } = this;

    const next = this.generateCatchNext(error, request, response, catchers);

    response.next = next;

    next();
  }

  protected generateCatchNext(
    error: Error,
    req: Request,
    res: Response,
    catchers: ErrorHandlerT<Request, Response>[] = [],
  ): NextT {
    const length = catchers.length;
    let index = 0;

    const next = (err?: Error) => {
      if (err) return this.defaultCatch(err, req, res);

      if (index === length) {
        return this.defaultCatch(new Error(), req, res);
      }

      try {
        const result = catchers[index++](error, req, res, next);

        if (result instanceof Promise) {
          result.catch((err) => this.defaultCatch(err, req, res));
        }
      } catch (err) {
        this.defaultCatch(err, req, res);
      }
    };

    return next;
  }

  protected defaultCatch(
    error: Error,
    request: Request,
    response: Response,
  ): void {
    if (response.headersSent) {
      return request.socket.destroy();
    }

    const {
      message = STATUS_CODES[STATUS.INTERNAL_SERVER_ERROR],
      stack,
    } = error;

    const stackDetails = stack
      ?.split(/\r?\n/)
      .map((line) => line.replace(/^ */, ""))
      .slice(1);

    let status: StatusT;
    let details: Record<string, unknown>;

    if (error instanceof HttpError) {
      status = error.statusCode;
      details = error.details;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { status: errorStatus, statusCode } = error as any;

      if (
        typeof errorStatus === "number" &&
        errorStatus >= 400 &&
        errorStatus < 600
      ) {
        status = errorStatus as StatusT;
      } else if (
        typeof statusCode === "number" &&
        statusCode >= 400 &&
        statusCode < 600
      ) {
        status = statusCode as StatusT;
      } else {
        status = STATUS.INTERNAL_SERVER_ERROR;
      }
    }

    response.status(status).format({
      "application/json": () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json: Record<string, any> = { message };

        if (stackDetails && stackDetails.length > 0) json.stack = stackDetails;

        if (details && Object.keys(details).length > 0) json.details = details;

        response.json(json);
      },
      default: () => response.send(message),
      "text/html": () => {
        const body = escapeHtml(stack ?? error.toString() ?? message)
          .replace(/\r?\n/g, "<br>")
          .replace(/\x20{2}/g, " &nbsp;");

        response.send(
          `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${message}</title></head><body><pre>${body}</pre></body></html>`,
        );
      },
    });
  }

  protected routes(): RoutesT<Request, Response> {
    return routes(this.tree);
  }
}

for (const method of METHODS) {
  const name = method.toLowerCase() as Lowercase<MethodT>;

  if (name in Router.prototype) {
    throw new Error(`Method already exists: ${name}`);
  }

  Router.prototype[name] = function (
    this: Router,
    path: string,
    ...handlers: HandlersT
  ) {
    return this.on(method, path, ...handlers);
  };
}

export default Router;
