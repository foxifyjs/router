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
  PARAM_LABEL,
  WILDCARD_LABEL,
} from "./constants";
import Handlers from "./Handlers";
import Options from "./Options";

interface Node<Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT> {
  constructor: typeof Node;
}

class Node<Request extends RequestT = RequestT,
  Response extends ResponseT = ResponseT> {
  public readonly handlers: NodeHandlersT<Request, Response> = new Handlers<Request, Response>();

  public readonly options: NodeOptionsT = new Options();

  public readonly children: NodeChildrenT<Request, Response> = {};

  public readonly methods: MethodT[] = [];

  public allowHeader = "";

  public childrenCount = 0;

  public neighborParamNode?: Node<Request, Response> = undefined;

  public matchingWildcardNode?: Node<Request, Response> = undefined;

  public matchAllParamRegExp?: RegExp = undefined;

  public param?: string = undefined;

  public label!: string;

  public prefixLength!: number;

  public type!: NODE;

  public constructor(public prefix = "/") {
    this.init(prefix);
  }

  public static isNode<Request extends RequestT = RequestT,
    Response extends ResponseT = ResponseT>(value: unknown): value is Node<Request, Response> {
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
    if (handlers.length === 0) return this;

    const nodeHandlers = this.handlers[method];

    if (nodeHandlers.length === 0) {
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

    Object.assign(this.options[method], options);

    nodeHandlers.push(...handlers);

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public findHandlers(method: MethodT, params: Record<string, any> = {}): HandlersResultT<Request, Response> {
    const {
      handlers: { [method]: handlers },
      allowHeader,
      options: { [method]: options },
    } = this;

    return { handlers, allowHeader, options, params };
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
    const children = this.children;

    return children[path[index]] ?? children[PARAM_LABEL] ?? children[WILDCARD_LABEL];
  }

  protected init(prefix: string): this {
    this.prefixLength = prefix.length;
    this.label = prefix[0];

    switch (this.label) {
      case PARAM_LABEL: {
        this.param = prefix.slice(1);
        this.type = NODE.PARAM;

        if (this.param === "$") throw new Error("Invalid parameter name");

        break;
      }
      case WILDCARD_LABEL: {
        this.param = prefix.slice(1) || "$";
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
