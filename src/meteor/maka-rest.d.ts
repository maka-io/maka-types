declare module 'meteor/maka:rest' {
  import { IncomingMessage, ServerResponse } from 'http';
  import { RateLimiterMemory, RateLimiterRedis, IRateLimiterOptions } from 'rate-limiter-flexible';
  import { RedisClientType } from '@redis/client';
  import { Meteor } from 'meteor/meteor';

  export type LoginType = 'default' | null;

  export interface MakaRestOptions {
    debug?: boolean;
    paths: string[];
    apiRoot: string; // Root of the API, e.g., 'api'
    apiPath?: string; // Additional path after the version, required unless isRoot is true
    version: string; // API version, e.g., 'v1'
    isRoot?: boolean; // If true, this instance represents the root of the API
    prettyJson: boolean;
    auth: {
      token: string;
      user: (http: IncomingMessage) => { token?: string };
    };
    defaultHeaders: Record<string, string>;
    enableCors: boolean;
    defaultOptionsEndpoint?: () => RouteOptions;
    rateLimitOptions?: IRateLimiterOptions
    & {
      useRedis?: boolean;
      redis?: RedisClientType;
      keyGenerator?: (req: Request) => string;
    };
  }

  export default class MakaRest {
    private readonly _routes: Route[];
    private readonly _config: MakaRestOptions;
    private readonly rateLimiter?: RateLimiterMemory | RateLimiterRedis;
    private readonly partialApiPath: string;
    static defaultAuthInitialized: boolean;
    request: Request;
    response: Response;
    constructor(options: Partial<MakaRestOptions>);

    static interceptorType: (req: IncomingMessage, res: Response, next: Function) => void;
    static interceptors: Array<typeof MakaRest.interceptorType>;
    static addInterceptor(interceptor: typeof MakaRest.interceptorType): void;
    static executeInterceptors(req: IncomingMessage, res: Response, next: Function, index?: number): void;
    static auth: {
      loginType: LoginType;
      onLoggedIn: (req: IncomingMessage) => void;
      onLoggedOut: (req: IncomingMessage) => void;
      onLoginFailure: (req: IncomingMessage, reason?: string) => void;
    };

    private configureCors(): void;
    private normalizeApiPath(options: Partial<MakaRestOptions>): string;
    private initializeWildcardRoutes(): void;
    private initializeDefaultAuthEndpoints(): void;
    private login(incomingMessage: IncomingMessage): Promise<StatusResponse>;
    private logout(incomingMessage: IncomingMessage): Promise<StatusResponse>;
    private logoutAll(incomingMessage: IncomingMessage): Promise<StatusResponse>;

    addRoute(path: string, options: RouteOptions, endpoints?: { [method: string]: EndpointOptions }): void;
  }

  export interface Password {
    digest: string;
    algorithm: 'sha-256';
  }

  export interface AuthToken {
    authToken: string;
    userId: string;
    when: Date;
    error?: string;
  }

  export interface BodyParams {
    username?: string;
    email?: string;
    password: string;
    hashed?: boolean;
  }

  export class Auth {
    static loginWithPassword(user: Partial<Meteor.User>, password: string | Password): Promise<AuthToken>;
    private static validateUser(user: Partial<Meteor.User>): void;
    private static validatePassword(password: string | Password): void;
    static getUserQuerySelector(user: Partial<Meteor.User>): Partial<Meteor.User>;
    static extractUser(body: BodyParams): Partial<Meteor.User>;
    static extractPassword(body: BodyParams): string | Password;
  }

  export interface StatusResponse {
    statusCode: number;
    status: string;
    data: any;
    headers?: Record<string, string>;
    extra?: any;
  }

  export class Codes {
    private static generateResponse(statusCode: number, body: any, extra?: any, headers?: Record<string, string>): StatusResponse;
    static continue100(body?: any, extra?: any, headers?: Record<string, string>): StatusResponse;
    static success200(body?: any, extra?: any, headers?: Record<string, string>): StatusResponse;
    static success201(body?: any, extra?: any, headers?: Record<string, string>): StatusResponse;
    static noContent204(body?: any, extra?: any, headers?: Record<string, string>): StatusResponse;
    static movedPermanently301(redirectUrl: string, extra?: any, headers?: Record<string, string>): StatusResponse;
    static badRequest400(body?: any, extra?: any, headers?: Record<string, string>): StatusResponse;
    static unauthorized401(body?: any, extra?: any, headers?: Record<string, string>): StatusResponse;
    static forbidden403(body?: any, extra?: any, headers?: Record<string, string>): StatusResponse;
    static notFound404(body?: any, extra?: any, headers?: Record<string, string>): StatusResponse;
    static notAllowed405(body?: any, extra?: any, headers?: Record<string, string>): StatusResponse;
    static unsupported415(body?: any, extra?: any, headers?: Record<string, string>): StatusResponse;
    static teapot418(body?: any, extra?: any, headers?: Record<string, string>): StatusResponse;
    static tooManyRequests429(body?: any, extra?: any, headers?: Record<string, string>): StatusResponse;
    static serverError500(body?: any, extra?: any, headers?: Record<string, string>): StatusResponse;
  }

  export interface RouteHandler {
    method: string;
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => void;
  }

  export interface Middleware {
    (req: IncomingMessage, res: ServerResponse, next: Function): void;
  }

  export class JsonRoutes {
    private static instance: JsonRoutes;
    private routes: RouteHandler[];
    private middlewares: Middleware[];
    private errorMiddlewares: Middleware[];
    private responseHeaders: Record<string, string>;

    private constructor();

    public static getInstance(): JsonRoutes;
    public static add(method: string, path: string, handler: (req: IncomingMessage, res: ServerResponse) => void): void;
    public static use(middleware: Middleware): void;
    public static useErrorMiddleware(middleware: Middleware): void;
    public static setResponseHeaders(headers: Record<string, string>): void;
    public static sendResult(res: ServerResponse, options: { code?: number; headers?: Record<string, string>; data?: any }): void;
    private setHeaders(res: ServerResponse, headers: Record<string, string>): void;
    private writeJsonToBody(res: ServerResponse, json: any): void;
    private matchRoute(req: IncomingMessage): RouteHandler | undefined;
    private parseJsonBody(req: IncomingMessage): Promise<any>;
    private processRequest(req: IncomingMessage, res: ServerResponse): Promise<void>;
    private routeRequest(req: IncomingMessage, res: ServerResponse): void;
    private handleError(error: any, res: ServerResponse): void;
    public static processRoutes(apiRoot: string): void;
  }

  export interface EndpointContext {
    urlParams: any;
    queryParams: any;
    bodyParams: any;
    request: Request;
    response: Response;
    done: () => void;
    user?: Meteor.User;
    userId?: string;
  }

  export interface EndpointOptions {
    authRequired?: boolean;
    roleRequired?: string[];
    scopeRequired?: string[];
    action: (context: EndpointContext) => Promise<any>;
  }

  export interface RouteOptions {
    [key: string]: any; // Define specific routes here (e.g., get, post, put, del)
    rateLimit?: {
      points?: number;
      duration?: number;
    };
  }

  export class Route {
    private api: MakaRest;
    private path: string;
    private options: RouteOptions;
    private endpoints: { [method: string]: EndpointOptions };
    private jsonRoutes: JsonRoutes;
    private rateLimiter?: RateLimiterMemory | RateLimiterRedis;

    constructor(api: MakaRest, path: string, options: RouteOptions, endpoints: { [method: string]: EndpointOptions });

    addToApi(onRoot?: boolean): void;

    private _resolveEndpoints(): void;
    private _configureEndpoints(): void;
    private _callEndpoint(endpointContext: EndpointContext, endpoint: EndpointOptions): Promise<StatusResponse>;
    private _authAccepted(endpointContext: EndpointContext, endpoint: EndpointOptions): Promise<{ success: boolean; data?: any }>;
    private _authenticate(endpointContext: EndpointContext): Promise<{ success: boolean; data?: any }>;
    private _roleAccepted(endpointContext: EndpointContext, endpoint: EndpointOptions): boolean;
  }
}
