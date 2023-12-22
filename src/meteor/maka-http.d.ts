declare module 'meteor/maka:http' {
  /**
   * Namespace for HTTP functionalities on the server.
   */
  namespace HTTPServer {
    /**
     * Represents the options for an HTTP call on the server.
     * @typeparam T The type of the `data` field in the options, default is `any`.
     */
    interface Options<T = any> {
      data?: T;
      params?: { [key: string]: any };
      headers?: { [key: string]: string };
      followRedirects?: boolean;
    }

    /**
     * Performs an HTTP call on the server.
     * @param method The HTTP method (e.g., 'GET', 'POST').
     * @param url The URL to which the request is sent.
     * @param options The options for the HTTP request.
     * @returns A promise that resolves with the HTTP response.
     */
    function call(
      method: string,
      url: string,
      options?: HTTPServer.Options,
    ): Promise<HTTPCommon.HTTPResponse>;
  }

  /**
   * Namespace for HTTP functionalities on the client.
   */
  namespace HTTPClient {
    /**
     * Represents the options for an HTTP call on the client.
     * @typeparam T The type of the `data` field in the options, default is `any`.
     */
    interface Options<T = any> {
      data?: T;
      params?: { [key: string]: any };
      headers?: { [key: string]: string };
    }

    /**
     * Performs an HTTP call on the client.
     * @param method The HTTP method (e.g., 'GET', 'POST').
     * @param url The URL to which the request is sent.
     * @param options The options for the HTTP request.
     * @returns A promise that resolves with the HTTP response.
     */
    function call(
      method: string,
      url: string,
      options?: HTTPClient.Options,
    ): Promise<HTTPCommon.HTTPResponse>;
  }

  /**
   * Common namespace for HTTP functionalities shared by both server and client.
   */
  namespace HTTPCommon {
    /**
     * Represents the HTTP response returned by an HTTP call.
     * @typeparam T The type of the `data` field in the response, default is `any`.
     */
    interface HTTPResponse<T = any> {
      statusCode: number;
      headers: { [id: string]: string };
      data: T;
    }

    interface RequestInterceptor {
      (method: string, url: string, options: HTTPServer.Options | HTTPClient.Options): Promise<{ method: string, url: string; options: HTTPServer.Options | HTTPClient.Options }>;
    }

    interface ResponseInterceptor {
      (response: HTTPCommon.HTTPResponse): Promise<HTTPCommon.HTTPResponse>;
    }

    // Documentation for del, get, post, put follows a similar pattern.
    function del<T = any>(url: string, callOptions?: HTTPServer.Options | HTTPClient.Options): Promise<HTTPCommon.HTTPResponse<T>>;
    function get<T = any>(url: string, callOptions?: HTTPServer.Options | HTTPClient.Options): Promise<HTTPCommon.HTTPResponse<T>>;
    function post<T = any>(url: string, callOptions?: HTTPServer.Options | HTTPClient.Options): Promise<HTTPCommon.HTTPResponse<T>>;
    function put<T = any>(url: string, callOptions?: HTTPServer.Options | HTTPClient.Options): Promise<HTTPCommon.HTTPResponse<T>>;
  }
}
