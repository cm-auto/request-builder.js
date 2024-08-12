export declare class RequestBuilder {
    private _url;
    private _urlParams;
    private _method;
    private _headers;
    private _body;
    private _initFields;
    constructor(url?: URL | string);
    url(url: string | URL, base?: string | URL): this;
    method(method: string, url?: string | URL, base?: string | URL): this;
    head(url?: string | URL, base?: string | URL): this;
    get(url?: string | URL, base?: string | URL): this;
    post(url?: string | URL, base?: string | URL): this;
    put(url?: string | URL, base?: string | URL): this;
    patch(url?: string | URL, base?: string | URL): this;
    delete(url?: string | URL, base?: string | URL): this;
    header(key: string, value: string): this;
    setHeader(key: string, value: string): this;
    appendHeader(key: string, value: string): this;
    contentType(contentType: string): this;
    jsonContentType(): this;
    authenticate(prefix: string, token: string): this;
    bearer(token: string): this;
    /**
     * Takes a value that can be serialized to JSON and sets it as the body. Additionally the content type will be set to application/json.
     * @param body value that can be serialized
     */
    json(body: any): this;
    jsonAlreadySerialized(body: string): this;
    bodyString(body: string): void;
    form(form: FormData | HTMLFormElement | string): this;
    text(body: string): this;
    urlEncodedBody(params: URLSearchParams | Record<string, any>): this;
    queryParams(params: URLSearchParams | Record<string, any>): this;
    body(body: BodyInit, contentType: string): this;
    gzipAlreadyCompressed(): this;
    /**
     * A body has to be set before calling this
     * @returns {RequestBuilderPromise}
     */
    gzip(): RequestBuilderPromise;
    private _compressWithCompressionStreamApi;
    setInitField(key: string, value: any): this;
    buildInit(): RequestInit;
    buildUrl(): URL;
    buildUrlAndInit(): [URL, RequestInit];
    build(): Request;
    /**
     * @returns {BodyInit}
     * @throws {DOMException} DataCloneError if the body could not be cloned
     */
    private _cloneBody;
    /**
     * Performs a deep clone of the RequestBuilder
     * @returns {RequestBuilder}
     * @throws {DOMException} DataCloneError if the body could not be cloned
     */
    clone(): RequestBuilder;
}
export declare class RequestBuilderPromise extends Promise<RequestBuilder> {
    constructor(executor: (resolve: (value: RequestBuilder | PromiseLike<RequestBuilder>) => void, reject: (reason?: any) => void) => void);
    build(): Promise<Request>;
    static fromPromise(promise: Promise<RequestBuilder>): RequestBuilderPromise;
}
