import {
  MethodT,
  Request as RequestT,
  Response as ResponseT,
  StatusT,
} from "@foxify/http";
import fastJson from "fast-json-stringify";
import {
  HandlersResultT,
  HandlerT,
  NODE,
  NodeChildrenT,
  NodeHandlersT,
  NodeOptionsT,
  NodeSchemaOptionsI,
  OptionsI,
} from "./constants";

interface Node<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> {
  constructor: typeof Node;
}

class Node<
  Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT
> {
  public readonly handlers: NodeHandlersT<Request, Response> = {};

  public readonly options: NodeOptionsT = {} as never;

  public readonly children: NodeChildrenT<Request, Response> = {};

  public readonly methods: MethodT[] = [];

  public allowHeader = "";

  public childrenCount = 0;

  public neighborParamNode?: Node<Request, Response>;

  public matchingWildcardNode?: Node<Request, Response>;

  public matchAllParamRegExp?: RegExp;

  public param?: string;

  public label!: string;

  public prefixLength!: number;

  public type!: NODE;

  public constructor(public prefix = "/") {
    this.init(prefix);
  }

  public static isNode<
    Request extends RequestT = RequestT,
    Response extends ResponseT = ResponseT
  >(value: unknown): value is Node<Request, Response> {
    return value instanceof this;
  }

  public resetLabel(prefix: string): this {
    this.prefix = prefix;

    return this.init(prefix);
  }

  public addHandlers(
    method: MethodT,
    options: OptionsI,
    handlers: HandlerT<Request, Response>[],
  ): this {
    let nodeHandlers = this.handlers[method];
    let nodeOptions = this.options[method];

    if (nodeHandlers === undefined) {
      nodeHandlers = this.handlers[method] = [];
      nodeOptions = this.options[method] = {} as never;

      this.methods.push(method);
      this.methods.sort();
      this.allowHeader = this.methods.join(", ");
    }

    if (options.schema === undefined) options.schema = {};
    if (options.schema.response === undefined) options.schema.response = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = options.schema.response;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options.schema.response = Object.keys(schema).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result, status: any) => {
        const value = schema[status as StatusT]!;

        if (typeof value === "function") {
          result[status as StatusT] = value;
        } else {
          result[status as StatusT] = fastJson(value);
        }

        return result;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      },
      {} as NodeSchemaOptionsI["response"],
    );

    this.options[method] = { ...nodeOptions, ...options } as never;

    nodeHandlers.push(...handlers);

    return this;
  }

  public findHandlers(method: MethodT): HandlersResultT<Request, Response> {
    const {
      handlers: { [method]: handlers },
      allowHeader,
      options: { [method]: options },
    } = this;

    return { handlers, allowHeader, options };
  }

  public addChild(node: Node<Request, Response>): Node<Request, Response>;
  public addChild(prefix?: string): Node<Request, Response>;
  public addChild(
    prefix: string | Node<Request, Response> = "/",
  ): Node<Request, Response> {
    let node: Node<Request, Response>;

    if (Node.isNode<Request, Response>(prefix)) node = prefix;
    else node = new this.constructor(prefix);

    const label = node.label;

    this.children[label] = node;

    this.childrenCount = Object.keys(this.children).length;

    return node;
  }

  public findChildByLabel(label: string): Node<Request, Response> | undefined {
    return this.children[label];
  }

  public findChild(path: string, index = 0): Node<Request, Response> | undefined {
    const { children } = this;

    return children[path[index]] ?? children[":"] ?? children["*"];
  }

  protected init(prefix: string): this {
    this.prefixLength = prefix.length;
    this.label = prefix[0];

    switch (this.label) {
      case ":": {
        this.param = prefix.slice(1);
        this.type = NODE.PARAM;

        break;
      }
      case "*": {
        this.param = prefix.slice(1) || "*";
        this.type = NODE.MATCH_ALL;

        break;
      }
      default: {
        this.param = undefined;
        this.type = NODE.STATIC;

        break;
      }
    }

    return this;
  }
}

export default Node;
