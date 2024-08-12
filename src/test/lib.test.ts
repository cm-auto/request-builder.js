import { RequestBuilder } from "../lib"

function getDefaultBuilder() {
    return new RequestBuilder("https://example.com")
        // required in node
        .setInitField("duplex", "half")
}

test("default method is GET", () => {
    const request = getDefaultBuilder().build()
    const expected = "GET"
    const actual = request.method
    expect(actual).toBe(expected)
})

test("json gzip compression works", async () => {
    const unserializedBody = {
        foo: "bar",
        bar: "foo",
        text1: "consectetur adipiscing elit. Pellentesque auctor, tellus a ultricies. Lorem ipsum dolor sit amet.",
        text2: "lorem ipsum dolor sit amet. consectetur adipiscing elit. Pellentesque auctor, tellus a ultricies",
    }
    const request = await getDefaultBuilder()
        .post()
        .json(unserializedBody)
        .gzip()
        .build()

    const expected = "gzip"
    const actual = request.headers.get("content-encoding")
    expect(actual).toBe(expected)

    const compressedBody = await request.blob()
    const decompressed = await decompress("gzip", compressedBody)
    const serializedJson = await decompressed.text()
    const deserializedBody = JSON.parse(serializedJson)
    expect(deserializedBody).toEqual(unserializedBody)
})

async function decompress(format: CompressionFormat, compressed: Blob) {
    const decompressionStream = new DecompressionStream(format)
    const decompressedStream = compressed.stream().pipeThrough(decompressionStream)
    const decompressedBlob = await new Response(decompressedStream, { headers: { "content-type": compressed.type } }).blob()
    return decompressedBlob
}

test("clone does deep clone", async () => {
    const builder = await new RequestBuilder()
        // required in node
        .setInitField("duplex", "half")
        .get("https://example.com")
        .queryParams({ foo: "bar" })
        .header("foo", "bar")
        .json({ foo: "bar" })
    // .gzip()

    // TODO: keep in mind that when comparing FormData body
    // it will be empty
    // const formData = new FormData()
    // formData.append("foo", "bar")
    // const builder = new RequestBuilder()
    //     // required in node
    //     .setInitField("duplex", "half")
    //     .get("https://example.com")
    //     .queryParams({ foo: "bar" })
    //     .header("foo", "bar")
    //     .form(formData)

    const clone = builder.clone()
    expect(clone).not.toBe(builder)
    expect(clone).toEqual(builder)
    const [url, init] = builder.buildUrlAndInit()
    const [clonedUrl, clonedInit] = clone.buildUrlAndInit()
    expect(init).not.toBe(clonedInit)
    expect(init).toEqual(clonedInit)
    expect(url).not.toBe(clonedUrl)
    expect(url).toEqual(clonedUrl)
    expect((builder as any)._urlParams).not.toBe((clone as any)._urlParams)
    expect((builder as any)._urlParams).toEqual((clone as any)._urlParams)
    expect(init.headers).not.toBe(clonedInit.headers)
    expect(init.headers).not.toBe(clonedInit.headers)

    // see: https://developers.cloudflare.com/workers/examples/logging-headers#the-problem
    // to find out why Object.fromEntries is needed
    const headersMap = Object.fromEntries(init.headers as any)
    const clonedHeadersMap = Object.fromEntries(clonedInit.headers as any)
    expect(headersMap).toEqual(clonedHeadersMap)
    const headersStringified = JSON.stringify(headersMap)
    const clonedHeadersStringified = JSON.stringify(clonedHeadersMap)
    expect(headersStringified).toEqual(clonedHeadersStringified)
    expect(headersStringified.length).toBeGreaterThan(2)
})

test("clone does deep clone with FormData", async () => {
    const formData = new FormData()
    formData.append("foo", "bar")
    const builder = new RequestBuilder()
        // required in node
        .setInitField("duplex", "half")
        .get("https://example.com")
        .form(formData)

    const clone = builder.clone()
    expect(clone).not.toBe(builder)
    expect(clone).toEqual(builder)
    const init = builder.buildInit()
    const clonedInit = clone.buildInit()
    expect(init).not.toBe(clonedInit)
    expect(init).toEqual(clonedInit)

    function checkBodies(body: BodyInit, clonedBody: BodyInit) {
        expect(body).not.toBe(clonedBody)
        const bodyMap = Object.fromEntries(body as any)
        const clonedBodyMap = Object.fromEntries(clonedBody as any)
        expect(bodyMap).toEqual(clonedBodyMap)
        const bodyMapStringified = JSON.stringify(bodyMap)
        const clonedBodyMapStringified = JSON.stringify(clonedBodyMap)
        expect(bodyMapStringified).toEqual(clonedBodyMapStringified)
        expect(bodyMapStringified.length).toBeGreaterThan(2)
    }
    checkBodies(init.body!, clonedInit.body!)
    checkBodies((builder as any)._body, (clone as any)._body)
})