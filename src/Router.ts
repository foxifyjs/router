import {
  HttpError,
  MethodNotAllowed,
  METHODS,
  MethodT,
  NotFound,
  Request as RequestT,
  Response as ResponseT,
  STATUS,
  StatusT,
} from "@foxify/http";
import assert from "assert";
import escapeHtml from "escape-html";
import { STATUS_CODES } from "http";
import { compact, deepFlatten } from "prototyped.js/dist/array";
import {
  EMPTY_OPTIONS,
  EMPTY_RESULT,
  ErrorHandlersT,
  ErrorHandlerT,
  HandlersResultT,
  HandlersT,
  HandlerT,
  MiddlewaresT,
  NextT,
  NODE,
  OptionsI,
  ParamHandlerI,
  RouteMethodsT,
  RoutesT,
  ShortHandRouteT,
} from "./constants";
import Node from "./Node";
import {
  assignMatchAllNode,
  assignParamNode,
  prettyPrint,
  routes,
} from "./utils";

interface Router<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> {
  acl: ShortHandRouteT<Request, Response, this>;
  bind: ShortHandRouteT<Request, Response, this>;
  checkout: ShortHandRouteT<Request, Response, this>;
  connect: ShortHandRouteT<Request, Response, this>;
  copy: ShortHandRouteT<Request, Response, this>;
  delete: ShortHandRouteT<Request, Response, this>;
  get: ShortHandRouteT<Request, Response, this>;
  head: ShortHandRouteT<Request, Response, this>;
  link: ShortHandRouteT<Request, Response, this>;
  lock: ShortHandRouteT<Request, Response, this>;
  "m-search": ShortHandRouteT<Request, Response, this>;
  merge: ShortHandRouteT<Request, Response, this>;
  mkactivity: ShortHandRouteT<Request, Response, this>;
  mkcalendar: ShortHandRouteT<Request, Response, this>;
  mkcol: ShortHandRouteT<Request, Response, this>;
  move: ShortHandRouteT<Request, Response, this>;
  notify: ShortHandRouteT<Request, Response, this>;
  options: ShortHandRouteT<Request, Response, this>;
  patch: ShortHandRouteT<Request, Response, this>;
  post: ShortHandRouteT<Request, Response, this>;
  pri: ShortHandRouteT<Request, Response, this>;
  propfind: ShortHandRouteT<Request, Response, this>;
  proppatch: ShortHandRouteT<Request, Response, this>;
  purge: ShortHandRouteT<Request, Response, this>;
  put: ShortHandRouteT<Request, Response, this>;
  rebind: ShortHandRouteT<Request, Response, this>;
  report: ShortHandRouteT<Request, Response, this>;
  search: ShortHandRouteT<Request, Response, this>;
  source: ShortHandRouteT<Request, Response, this>;
  subscribe: ShortHandRouteT<Request, Response, this>;
  trace: ShortHandRouteT<Request, Response, this>;
  unbind: ShortHandRouteT<Request, Response, this>;
  unlink: ShortHandRouteT<Request, Response, this>;
  unlock: ShortHandRouteT<Request, Response, this>;
  unsubscribe: ShortHandRouteT<Request, Response, this>;
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

    const {
      handlers = [],
      allowHeader = "",
      options: { schema: { response: stringify } } = EMPTY_OPTIONS,
    } = this.find(method, path, params);

    response.stringify = stringify;

    const next = this.generateNext(
      request,
      response,
      method,
      allowHeader,
      handlers,
    );

    response.next = next;

    next();
  }

  public find(
    method: MethodT,
    path: string,
    params: Record<string, unknown> = {},
  ): Partial<HandlersResultT<Request, Response>> {
    const originalPath = path;
    let node: Node<Request, Response> | undefined = this.tree;

    if (path[0] === "/") {
      if (path.length === 1) {
        return node.findHandlers(method);
      }

      path = path.slice(1);
    }

    node = node.findChild(path);

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

              node = node.findChild(path);

              continue;
            }
          } else if (prefix === path) {
            return node.findHandlers(method);
          }

          const paramNode = node.neighborParamNode;

          if (paramNode === undefined) {
            node = node.matchingWildcardNode;

            continue;
          }

          node = paramNode;
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

            node = node.findChild(path);

            continue;
          }

          node = node.matchingWildcardNode;

          if (node === undefined) return EMPTY_RESULT;
        }
        case NODE.MATCH_ALL: {
          const { param, matchAllParamRegExp } = node;

          params[param!] = originalPath.match(matchAllParamRegExp!)![1];

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

      for (const [method, path, options, handlers] of routes) {
        this.on(method, path, options, handlers);
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

  public all(
    path: string,
    options?:
      | OptionsI
      | HandlersT<Request, Response>
      | HandlerT<Request, Response>
      | false
      | null,
    ...handlers: HandlersT<Request, Response>
  ): this {
    return this.on(METHODS, path, options, handlers);
  }

  public route(path: string): RouteMethodsT<Request, Response> {
    const ROUTER = METHODS.reduce((router, method) => {
      const name = method.toLowerCase() as Lowercase<MethodT>;

      router[name] = (options, ...handlers) => {
        this.on(method, path, options, handlers);

        return ROUTER;
      };

      return router;
    }, {} as RouteMethodsT<Request, Response>);

    return ROUTER;
  }

  public on(
    method: MethodT | MethodT[],
    path: string,
    options:
      | OptionsI
      | HandlersT<Request, Response>
      | HandlerT<Request, Response>
      | false
      | null
      | undefined = {},
    ...handlers: HandlersT<Request, Response>
  ): this {
    if (
      options == null ||
      options === false ||
      typeof options === "function" ||
      Array.isArray(options)
    ) {
      handlers = [options as HandlerT<Request, Response>, ...handlers];
      options = {};
    }

    handlers = compact(deepFlatten(handlers));

    if (handlers.length === 0) return this;

    if (Array.isArray(method)) {
      for (const item of method) this.on(item, path, options, handlers);

      return this;
    }

    const { prefix: routerPrefix, middlewares, paramHandlers } = this;

    path = `${routerPrefix}${path}`.replace(/\/{2,}/g, "/");

    const originalPath = path;

    if (path[0] === "/") path = path.slice(1);

    const params: string[] = [];

    let node: Node<Request, Response> | undefined = this.tree;

    let currentNode: Node<Request, Response> = node;
    let matchAllNode: Node<Request, Response> | undefined;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      matchAllNode = currentNode.findChildByLabel("*") || matchAllNode;

      if (path.length === 0) {
        for (const param of params) {
          const paramHandler = paramHandlers[param];

          if (paramHandler !== undefined)
            handlers = [paramHandler, ...handlers];
        }

        if (node.type === NODE.MATCH_ALL) {
          if (node.matchAllParamRegExp === undefined) {
            node.matchAllParamRegExp = new RegExp(
              `^${originalPath
                .replace(/(:[^/]+)/g, "[^/]+")
                .replace(/\*.*/, "(.*)")}$`,
            );
          }

          assignMatchAllNode(currentNode, node);
        } else {
          if (node.type === NODE.PARAM) {
            assignParamNode(currentNode, node);
          } else {
            node.neighborParamNode = currentNode.findChildByLabel(":");
          }

          node.matchingWildcardNode = matchAllNode;
        }

        node.addHandlers(
          method,
          options,
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
    method: MethodT,
    allowHeader: string,
    handlers: HandlerT<Request, Response>[] = [],
  ): NextT {
    const length = handlers.length;
    let index = 0;

    const next = (error?: Error) => {
      if (error) return this.throw(error, req, res);

      if (index === length) {
        if (allowHeader.length > 0 && allowHeader.indexOf(method) === -1) {
          return this.throw(new MethodNotAllowed(allowHeader), req, res);
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
        return this.defaultCatch(error, req, res);
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

    const stack = error.stack;
    let message = error.message;

    if (error instanceof MethodNotAllowed) {
      response.setHeader("Allow", message);

      message = STATUS_CODES[STATUS.METHOD_NOT_ALLOWED]!;
    } else if (!message) {
      message = STATUS_CODES[STATUS.INTERNAL_SERVER_ERROR]!;
    }

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

  assert(!(name in Router.prototype), `Method already exists: ${name}`);

  Router.prototype[name] = function (path, options, ...handlers) {
    return this.on(method, path, options, ...handlers);
  };
}

export default Router;
