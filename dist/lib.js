export class RequestBuilder {
    constructor(url) {
        this._url = null;
        this._urlParams = null;
        this._method = "GET";
        this._headers = new Headers();
        this._body = null;
        this._initFields = {};
        if (url) {
            this.url(url);
        }
    }
    url(url, base) {
        this._url = new URL(url, base);
        return this;
    }
    method(method, url, base) {
        this._method = method;
        if (url || url === "") {
            this.url(url, base);
        }
        return this;
    }
    head(url, base) {
        return this.method("HEAD", url, base);
    }
    get(url, base) {
        return this.method("GET", url, base);
    }
    post(url, base) {
        return this.method("POST", url, base);
    }
    put(url, base) {
        return this.method("PUT", url, base);
    }
    patch(url, base) {
        return this.method("PATCH", url, base);
    }
    delete(url, base) {
        return this.method("DELETE", url, base);
    }
    header(key, value) {
        this.setHeader(key, value);
        return this;
    }
    setHeader(key, value) {
        this._headers.set(key, value);
        return this;
    }
    appendHeader(key, value) {
        this._headers.append(key, value);
        return this;
    }
    contentType(contentType) {
        return this.setHeader("content-type", contentType);
    }
    jsonContentType() {
        return this.contentType("application/json");
    }
    authenticate(prefix, token) {
        return this.setHeader("authorization", `${prefix} ${token}`);
    }
    bearer(token) {
        return this.authenticate("Bearer", token);
    }
    // TODO: can we change the type of body to something that can always be serialized?
    /**
     * Takes a value that can be serialized to JSON and sets it as the body. Additionally the content type will be set to application/json.
     * @param body value that can be serialized
     */
    json(body) {
        this.jsonContentType();
        this.bodyString(JSON.stringify(body));
        return this;
    }
    jsonAlreadySerialized(body) {
        this.jsonContentType();
        this.bodyString(body);
        return this;
    }
    bodyString(body) {
        this._body = body;
        return;
    }
    form(form) {
        let _formData;
        {
            if (form instanceof FormData) {
                _formData = form;
            }
            else if (form instanceof HTMLFormElement) {
                _formData = new FormData(form);
            }
            else if (typeof form === "string") {
                const element = document.createElement("form");
                if (!(element instanceof HTMLFormElement)) {
                    throw new Error("form is not a form element");
                }
                _formData = new FormData(element);
            }
            else {
                throw new Error("form could not be transformed to FormData");
            }
        }
        const formData = _formData;
        this.body(formData, "multipart/form-data");
        return this;
    }
    // TODO: is javascript string always utf-8?
    text(body) {
        this.body(body, "text/plain; charset=utf-8");
        return this;
    }
    urlEncodedBody(params) {
        let _body;
        {
            if (params instanceof URLSearchParams) {
                _body = params;
            }
            else {
                _body = new URLSearchParams(params);
            }
        }
        const body = _body;
        this.body(body, "application/x-www-form-urlencoded");
        return this;
    }
    queryParams(params) {
        let _parsedParams;
        {
            if (params instanceof URLSearchParams) {
                _parsedParams = params;
            }
            else {
                _parsedParams = new URLSearchParams(params);
            }
        }
        const parsedParams = _parsedParams;
        this._urlParams = parsedParams;
        return this;
    }
    body(body, contentType) {
        this._body = body;
        this.contentType(contentType);
        return this;
    }
    gzipAlreadyCompressed() {
        this.setHeader("content-encoding", "gzip");
        return this;
    }
    /**
     * A body has to be set before calling this
     * @returns {RequestBuilderPromise}
     */
    gzip() {
        const promise = this._compressWithCompressionStreamApi("gzip").then(builder => builder.gzipAlreadyCompressed());
        return RequestBuilderPromise.fromPromise(promise);
    }
    // TODO: it seems like the namings of the compression formats are not correct
    // see: https://stackoverflow.com/questions/883841/why-do-real-world-servers-prefer-gzip-over-deflate-encoding
    // public deflateAlreadyCompressed() {
    // 	this.setHeader("content-encoding", "deflate")
    // 	return this
    // }
    // public deflate() {
    // 	const promise = this._compressWithCompressionStreamApi("deflate").then(builder => builder.deflateAlreadyCompressed())
    // 	return RequestBuilderPromise.fromPromise(promise)
    // }
    // public deflateRawAlreadyCompressed() {
    // 	this.setHeader("content-encoding", "deflate-raw")
    // 	return this
    // }
    // public deflateRaw() {
    // 	const promise = this._compressWithCompressionStreamApi("deflate-raw").then(builder => builder.deflateRawAlreadyCompressed())
    // 	return RequestBuilderPromise.fromPromise(promise)
    // }
    // TODO: the content-length header has to be of the compressed data
    // does the browser do this automatically?
    // also set a header that contains the original content-length to prevent gzip bomb attacks
    _compressWithCompressionStreamApi(format) {
        const promise = new RequestBuilderPromise(async (resolve, reject) => {
            // only do something if the CompressionStream API is available
            // see: https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API
            if (CompressionStream) {
                const uncompressed = this._body;
                if (uncompressed === null) {
                    // throw new Error("cannot compress null body")
                    return reject(new Error("cannot compress null body"));
                }
                this._body = await compress(format, uncompressed);
            }
            return resolve(this);
        });
        return promise;
    }
    // cookies won't work in browser but would probably
    // work in deno and node.js
    // public cookie(key: string, value: string) {
    // }
    setInitField(key, value) {
        this._initFields[key] = value;
        return this;
    }
    buildInit() {
        const init = Object.assign(Object.assign({}, this._initFields), { method: this._method, headers: this._headers, body: this._body });
        return init;
    }
    buildUrl() {
        if (!this._url) {
            throw new Error("builder does not contain a valid URL");
        }
        const urlParams = this._urlParams;
        if (urlParams) {
            this._url.search = `?${urlParams.toString()}`;
        }
        return this._url;
    }
    buildUrlAndInit() {
        const url = this.buildUrl();
        const init = this.buildInit();
        return [url, init];
    }
    build() {
        return new Request(...this.buildUrlAndInit());
    }
    /**
     * @returns {BodyInit}
     * @throws {DOMException} DataCloneError if the body could not be cloned
     */
    _cloneBody() {
        // structuredClone will just return an empty object for FormData
        if (this._body instanceof FormData) {
            const clone = new FormData();
            for (const [key, value] of this._body.entries()) {
                clone.append(key, value);
            }
            return clone;
        }
        // this might through for some kind of bodies, for example when using gzip()
        // TODO: can gzipped body be cloned?
        return structuredClone(this._body);
    }
    /**
     * Performs a deep clone of the RequestBuilder
     * @returns {RequestBuilder}
     * @throws {DOMException} DataCloneError if the body could not be cloned
     */
    clone() {
        const urlClone = this._url ? new URL(this._url.href) : undefined;
        const urlParams = this._urlParams ? new URLSearchParams(this._urlParams) : undefined;
        const clone = new RequestBuilder();
        if (urlClone) {
            clone.url(urlClone);
        }
        if (urlParams) {
            clone.queryParams(urlParams);
        }
        clone.method(this._method);
        clone._headers = new Headers(this._headers);
        clone._body = this._cloneBody();
        clone._initFields = structuredClone(this._initFields);
        return clone;
    }
}
export class RequestBuilderPromise extends Promise {
    constructor(executor) {
        super(executor);
    }
    async build() {
        const builder = await this;
        return builder.build();
    }
    static fromPromise(promise) {
        return new RequestBuilderPromise((resolve, reject) => {
            promise
                .then(builder => resolve(builder))
                .catch(error => reject(error));
        });
    }
}
async function compress(format, uncompressed) {
    const compressionStream = new CompressionStream(format);
    const writer = compressionStream.writable.getWriter();
    await writer.write(uncompressed);
    writer.close();
    return compressionStream.readable;
}
//# sourceMappingURL=lib.js.map