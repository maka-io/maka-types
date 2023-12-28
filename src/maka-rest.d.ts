declare module 'meteor/maka:rest' {
  import { IncomingMessage, ServerResponse } from 'http';
  import { RateLimiterMemory, RateLimiterRedis, IRateLimiterOptions } from 'rate-limiter-flexible';
  import { RedisClientType } from '@redis/client';
  import { Meteor } from 'meteor/meteor';

  namespace MakaRest {
    type LoginType = 'default' | null;

    interface MakaRestOptions {
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
      defaultOptionsEndpoint?: () => Route.RouteOptions;
      rateLimitOptions?: IRateLimiterOptions
        & {
          useRedis?: boolean;
          redis?: RedisClientType;
          keyGenerator?: (req: Request) => string;
        };
    }

    class MakaRest {
      private readonly _routes: Route.Route[];
      private readonly _config: MakaRestOptions;
      private readonly rateLimiter?: RateLimiterMemory | RateLimiterRedis;
      private readonly partialApiPath: string;
      static defaultAuthInitialized: boolean;
      request: Request;
      response: Response;

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

      constructor(options: Partial<MakaRestOptions>);
      private configureCors(): void;
      private normalizeApiPath(options: Partial<MakaRestOptions>): string;
      private initializeWildcardRoutes(): void;
      addRoute(path: string, options: Route.RouteOptions, endpoints: { [method: string]: Route.EndpointOptions }): void;
      private initializeDefaultAuthEndpoints(): void;
      private login(incomingMessage: IncomingMessage): Promise<Codes.StatusResponse>;
      private logout(incomingMessage: IncomingMessage): Promise<Codes.StatusResponse>;
      private logoutAll(incomingMessage: IncomingMessage): Promise<Codes.StatusResponse>;
    }
  }

  namespace Auth {
    interface Password {
      digest: string;
      algorithm: 'sha-256';
    }

    interface AuthToken {
      authToken: string;
      userId: string;
      when: Date;
      error?: string;
    }

    interface BodyParams {
      username?: string;
      email?: string;
      password: string;
      hashed?: boolean;
    }

    class Auth {
      static loginWithPassword(user: Partial<Meteor.User>, password: string | Password): Promise<AuthToken>;
      private static validateUser(user: Partial<Meteor.User>): void;
      private static validatePassword(password: string | Password): void;
      static getUserQuerySelector(user: Partial<Meteor.User>) : Partial<Meteor.User>;
      static extractUser(body: BodyParams): Partial<Meteor.User>;
      static extractPassword(body: BodyParams): string | Password;
    }
  }

  namespace Codes {
    interface StatusResponse {
      statusCode: number;
      status: string;
      data: any;
      headers?: Record<string, string>;
      extra?: any;
    }

    class Codes {
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
  }

  namespace JsonRoutes {
    interface RouteHandler {
      method: string;
      path: string;
      handler: (req: IncomingMessage, res: ServerResponse) => void;
    }

    interface Middleware {
      (req: IncomingMessage, res: ServerResponse, next: Function): void;
    }

    class JsonRoutes {
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
  }

  namespace Route {
    interface EndpointContext {
      urlParams: any;
      queryParams: any;
      bodyParams: any;
      request: Request;
      response: Response;
      done: () => void;
      user?: Meteor.User;
      userId?: string;
    }

    interface EndpointOptions {
      authRequired?: boolean;
      roleRequired?: string[];
      scopeRequired?: string[];
      action: (context: EndpointContext) => Promise<any>;
    }

    interface RouteOptions {
      [key: string]: any; // Define specific route options here
      rateLimit?: {
        points?: number;
        duration?: number;
      };
    }

    class Route {
      private api: MakaRest.MakaRest;
      private path: string;
      private options: RouteOptions;
      private endpoints: { [method: string]: EndpointOptions };
      private jsonRoutes: JsonRoutes.JsonRoutes;
      private rateLimiter?: RateLimiterMemory | RateLimiterRedis;

      constructor(api: MakaRest.MakaRest, path: string, options: RouteOptions, endpoints: { [method: string]: EndpointOptions });

      addToApi(onRoot?: boolean): void;

      private _resolveEndpoints(): void;
      private _configureEndpoints(): void;
      private _callEndpoint(endpointContext: EndpointContext, endpoint: EndpointOptions): Promise<Codes.StatusResponse>;
      private _authAccepted(endpointContext: EndpointContext, endpoint: EndpointOptions): Promise<{ success: boolean; data?: any }>;
      private _authenticate(endpointContext: EndpointContext): Promise<{ success: boolean; data?: any }>;
      private _roleAccepted(endpointContext: EndpointContext, endpoint: EndpointOptions): boolean;
    }
  }
}
