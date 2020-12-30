import type {
  MethodT,
  Request as RequestT,
  Response as ResponseT,
} from "@foxify/http";
import type NodeT from "./Node";
import type RouterT from "./Router";

export { METHOD, METHODS } from "@foxify/http";

export const EMPTY_RESULT = {};

export type { RequestT, ResponseT, MethodT };

export type NextT = (error?: Error) => void;

export interface ParamHandlerI<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> {
  [param: string]: HandlerT<Request, Response> | undefined;
}

export type RoutesT<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> = [method: MethodT, path: string, handlers: HandlerT<Request, Response>[]][];

export type HandlerT<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> = (request: Request, response: Response, next: NextT) => unknown;

export type HandlersT<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> = Array<
  | false
  | null
  | undefined
  | HandlerT<Request, Response>
  | HandlersT<Request, Response>
>;

export type MiddlewaresT<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> = Array<
  | false
  | null
  | undefined
  | RouterT<Request, Response>
  | HandlerT<Request, Response>
  | HandlersT<Request, Response>
>;

export type ErrorHandlerT<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> = (
  error: Error,
  request: Request,
  response: Response,
  next: NextT,
) => unknown;

export type ErrorHandlersT<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> = Array<
  | false
  | null
  | undefined
  | ErrorHandlerT<Request, Response>
  | ErrorHandlersT<Request, Response>
>;

export const enum NODE {
  STATIC,
  PARAM,
  MATCH_ALL,
}

export type HandlersResultT<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> = {
  handlers?: HandlerT<Request, Response>[];
  allowHeader: string;
};

export type NodeHandlersT<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> = {
  [Method in MethodT]?: HandlerT<Request, Response>[];
};

export type NodeChildrenT<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> = {
  [Label in string]?: NodeT<Request, Response>;
};

export interface ShortHandRoute<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT,
  Router extends RouterT<Request, Response> = RouterT<Request, Response>
> {
  (path: string, ...handlers: HandlersT<Request, Response>): Router;
}

export interface RouteMethod<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT,
  This extends RouteMethodsT<Request, Response> = RouteMethodsT<
    Request,
    Response
  >
> {
  (...handlers: HandlersT<Request, Response>): This;
}

export type RouteMethodsT<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> = {
  [method in Lowercase<MethodT>]: RouteMethod<
    Request,
    Response,
    RouteMethodsT<Request, Response>
  >;
};
