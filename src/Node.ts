import {
  HandlerT,
  MethodT,
  NODE,
  NodeChildrenT,
  HandlersResultT,
  NodeHandlersT,
  RequestT,
  ResponseT,
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

  public readonly children: NodeChildrenT<Request, Response> = {};

  public readonly methods: MethodT[] = [];

  public allowHeader = "";

  public childrenCount = 0;

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
    handlers: HandlerT<Request, Response>[],
  ): this {
    let nodeHandlers = this.handlers[method];

    if (nodeHandlers === undefined) {
      nodeHandlers = this.handlers[method] = [];

      this.methods.push(method);
      this.methods.sort();
      this.allowHeader = this.methods.join(", ");
    }

    nodeHandlers.push(...handlers);

    return this;
  }

  public findHandlers(method: MethodT): HandlersResultT<Request, Response> {
    const { handlers, allowHeader } = this;

    return { handlers: handlers[method], allowHeader };
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

  public findChild(path: string): Node<Request, Response> | undefined {
    const { children } = this;

    return children[path[0]] || children[":"] || children["*"];
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
