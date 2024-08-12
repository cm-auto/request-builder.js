export class RequestBuilder {

	private _url: URL | null = null
	private _urlParams: URLSearchParams | null = null
	private _method = "GET"
	private _headers: Headers = new Headers()
	private _body: BodyInit | null = null
	private _initFields: Record<string, any> = {}

	constructor(url?: URL | string) {
		if (url) {
			this.url(url)
		}
	}

	public url(url: string | URL, base?: string | URL) {
		this._url = new URL(url, base)
		return this
	}

	public method(method: string, url?: string | URL, base?: string | URL) {
		this._method = method
		if (url || url === "") {
			this.url(url, base)
		}
		return this
	}

	public head(url?: string | URL, base?: string | URL) {
		return this.method("HEAD", url, base)
	}

	public get(url?: string | URL, base?: string | URL) {
		return this.method("GET", url, base)
	}

	public post(url?: string | URL, base?: string | URL) {
		return this.method("POST", url, base)
	}

	public put(url?: string | URL, base?: string | URL) {
		return this.method("PUT", url, base)
	}

	public patch(url?: string | URL, base?: string | URL) {
		return this.method("PATCH", url, base)
	}

	public delete(url?: string | URL, base?: string | URL) {
		return this.method("DELETE", url, base)
	}

	public header(key: string, value: string) {
		this.setHeader(key, value)
		return this
	}

	public setHeader(key: string, value: string) {
		this._headers.set(key, value)
		return this
	}

	public appendHeader(key: string, value: string) {
		this._headers.append(key, value)
		return this
	}

	public contentType(contentType: string) {
		return this.setHeader("content-type", contentType)
	}

	public jsonContentType() {
		return this.contentType("application/json")
	}

	public authenticate(prefix: string, token: string) {
		return this.setHeader("authorization", `${prefix} ${token}`)
	}

	public bearer(token: string) {
		return this.authenticate("Bearer", token)
	}

	// TODO: can we change the type of body to something that can always be serialized?
	/**
	 * Takes a value that can be serialized to JSON and sets it as the body. Additionally the content type will be set to application/json.
	 * @param body value that can be serialized
	 */
	public json(body: any) {
		this.jsonContentType()
		this.bodyString(JSON.stringify(body))
		return this
	}

	public jsonAlreadySerialized(body: string) {
		this.jsonContentType()
		this.bodyString(body)
		return this
	}

	public bodyString(body: string) {
		this._body = body
		return
	}

	public form(form: FormData | HTMLFormElement | string) {
		let _formData
		{
			if (form instanceof FormData) {
				_formData = form
			}
			else if (form instanceof HTMLFormElement) {
				_formData = new FormData(form)
			}
			else if (typeof form === "string") {
				const element = document.createElement("form")
				if (!(element instanceof HTMLFormElement)) {
					throw new Error("form is not a form element")
				}
				_formData = new FormData(element)
			}
			else {
				throw new Error("form could not be transformed to FormData")
			}
		}
		const formData: FormData = _formData
		this.body(formData, "multipart/form-data")
		return this
	}

	// TODO: is javascript string always utf-8?
	public text(body: string) {
		this.body(body, "text/plain; charset=utf-8")
		return this
	}

	public urlEncodedBody(params: URLSearchParams | Record<string, any>) {
		let _body
		{
			if (params instanceof URLSearchParams) {
				_body = params
			}
			else {
				_body = new URLSearchParams(params)
			}
		}
		const body = _body
		this.body(body, "application/x-www-form-urlencoded")
		return this
	}

	public queryParams(params: URLSearchParams | Record<string, any>) {
		let _parsedParams
		{
			if (params instanceof URLSearchParams) {
				_parsedParams = params
			}
			else {
				_parsedParams = new URLSearchParams(params)
			}
		}
		const parsedParams = _parsedParams
		this._urlParams = parsedParams

		return this
	}

	public body(body: BodyInit, contentType: string) {
		this._body = body
		this.contentType(contentType)
		return this
	}

	public gzipAlreadyCompressed() {
		this.setHeader("content-encoding", "gzip")
		return this
	}

	/**
	 * A body has to be set before calling this
	 * @returns {RequestBuilderPromise}
	 */
	public gzip() {
		const promise = this._compressWithCompressionStreamApi("gzip").then(builder => builder.gzipAlreadyCompressed())
		return RequestBuilderPromise.fromPromise(promise)
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
	private _compressWithCompressionStreamApi(format: CompressionFormat) {
		const promise = new RequestBuilderPromise(async (resolve, reject) => {
			// only do something if the CompressionStream API is available
			// see: https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API
			if (CompressionStream) {
				const uncompressed = this._body
				if (uncompressed === null) {
					// throw new Error("cannot compress null body")
					return reject(new Error("cannot compress null body"))
				}
				this._body = await compress(format, uncompressed)
			}
			return resolve(this)
		})
		return promise
	}

	// cookies won't work in browser but would probably
	// work in deno and node.js
	// public cookie(key: string, value: string) {

	// }

	public setInitField(key: string, value: any) {
		this._initFields[key] = value
		return this
	}

	public buildInit() {
		const init: RequestInit = {
			...this._initFields,
			method: this._method,
			headers: this._headers,
			body: this._body,
		}
		return init
	}

	public buildUrl() {
		if (!this._url) {
			throw new Error("builder does not contain a valid URL")
		}
		const urlParams = this._urlParams
		if (urlParams) {
			this._url.search = `?${urlParams.toString()}`
		}
		return this._url
	}

	public buildUrlAndInit(): [URL, RequestInit] {
		const url = this.buildUrl()
		const init = this.buildInit()
		return [url, init]
	}

	public build(): Request {
		return new Request(...this.buildUrlAndInit())
	}

	/**
	 * @returns {BodyInit}
	 * @throws {DOMException} DataCloneError if the body could not be cloned
	 */
	private _cloneBody() {
		// structuredClone will just return an empty object for FormData
		if (this._body instanceof FormData) {
			const clone = new FormData()
			for (const [key, value] of this._body.entries()) {
				clone.append(key, value)
			}
			return clone
		}
		// this might through for some kind of bodies, for example when using gzip()
		// TODO: can gzipped body be cloned?
		return structuredClone(this._body)
	}

	/**
	 * Performs a deep clone of the RequestBuilder
	 * @returns {RequestBuilder}
	 * @throws {DOMException} DataCloneError if the body could not be cloned
	 */
	public clone(): RequestBuilder {
		const urlClone = this._url ? new URL(this._url.href) : undefined
		const urlParams = this._urlParams ? new URLSearchParams(this._urlParams) : undefined
		const clone = new RequestBuilder()
		if (urlClone) {
			clone.url(urlClone)
		}
		if (urlParams) {
			clone.queryParams(urlParams)
		}
		clone.method(this._method)
		clone._headers = new Headers(this._headers)
		clone._body = this._cloneBody()
		clone._initFields = structuredClone(this._initFields)

		return clone
	}

}

export class RequestBuilderPromise extends Promise<RequestBuilder> {
	constructor(executor: (resolve: (value: RequestBuilder | PromiseLike<RequestBuilder>) => void, reject: (reason?: any) => void) => void) {
		super(executor)
	}
	async build() {
		const builder = await this
		return builder.build()
	}

	static fromPromise(promise: Promise<RequestBuilder>) {
		return new RequestBuilderPromise((resolve, reject) => {
			promise
				.then(builder => resolve(builder))
				.catch(error => reject(error))
		})
	}
}

async function compress(format: CompressionFormat, uncompressed: BodyInit) {
	const compressionStream = new CompressionStream(format)
	const writer = compressionStream.writable.getWriter()
	await writer.write(uncompressed)
	writer.close()
	return compressionStream.readable
}
