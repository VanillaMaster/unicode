import { Stream } from "node:stream"
import { createInterface } from "node:readline"
import { createWriteStream } from "node:fs";
import { promisify } from "node:util";

async function* UnicodeData(url: string){
    const resp = await fetch(url);
    if (resp.body == null) throw new Error("ReadableStream is null");

    const reader = createInterface({
        //@ts-ignore
        input: Stream.Readable.fromWeb(resp.body),
        crlfDelay: Infinity,
    })
    
    for await (const line of reader) {
        yield line;
    }
}


// const private_15_first  = 0xF0000;
// const private_15_last   = 0xFFFFD;
// const private_16_first  = 0x100000;
// const private_16_last   = 0x10FFFD;

const General_Categories: Map<string, number> = new Map();
let id = 1;
let size = 0;
for await (const line of UnicodeData("https://unicode.org/Public/UCD/latest/ucd/UnicodeData.txt")) {
    const [
        code_value,
        character_name,
        general_category,
        canonical_combining_classes,
        bidirectional_category,
        character_decomposition_mapping,
        decimal_digit_value,
        digit_value,
        numeric_value,
        mirrored,
        unicode_1_0_name,
        iso_10646_comment_field,
        uppercase_mapping,
        lowercase_mapping,
        titlecase_mapping,
    ] = line.split(";");
    size++;
    if (!General_Categories.has(general_category)) {
        General_Categories.set(general_category, id++);
    }

}
const encoder = new TextEncoder();

let namesOffset = 0, headerOffset = 0, payloadOffset = 0;

const headerChunk = new ArrayBuffer((Uint32Array.BYTES_PER_ELEMENT * 1) + ((Uint32Array.BYTES_PER_ELEMENT + Uint8Array.BYTES_PER_ELEMENT) * (General_Categories.size + 1)));
const headerView = new DataView(headerChunk);

const names = Object.fromEntries(Array.from(General_Categories.keys()).reduce(function(accum: [string, Uint8Array][], key) {
    accum.push([key, encoder.encode(`${key}\u0003`)]);
    return accum
}, []));
const namesChunk = new Uint8Array(Object.values(names).reduce((accum, val) => accum + val.byteLength, 0))
const payloadChunk = new ArrayBuffer(size * (Uint32Array.BYTES_PER_ELEMENT + Uint8Array.BYTES_PER_ELEMENT));

const payloadView = new DataView(payloadChunk);

headerView.setUint32(headerOffset, headerChunk.byteLength + namesChunk.byteLength, true);
headerOffset += Uint32Array.BYTES_PER_ELEMENT;
for (const [general_category, id] of General_Categories) {

    const namePointer = headerChunk.byteLength + (namesOffset * Uint8Array.BYTES_PER_ELEMENT);

    headerView.setUint32(headerOffset, namePointer, true);
    headerOffset += Uint32Array.BYTES_PER_ELEMENT;
    headerView.setUint8(headerOffset, id);
    headerOffset += Uint8Array.BYTES_PER_ELEMENT;

    namesChunk.set(names[general_category], namesOffset);
    namesOffset += names[general_category].byteLength;
}

for await (const line of UnicodeData("https://unicode.org/Public/UCD/latest/ucd/UnicodeData.txt")) {
    const [
        code_value,
        character_name,
        general_category,
        canonical_combining_classes,
        bidirectional_category,
        character_decomposition_mapping,
        decimal_digit_value,
        digit_value,
        numeric_value,
        mirrored,
        unicode_1_0_name,
        iso_10646_comment_field,
        uppercase_mapping,
        lowercase_mapping,
        titlecase_mapping,
    ] = line.split(";");

    const codePoint = Number.parseInt(code_value, 16);

    payloadView.setUint32(payloadOffset, codePoint, true);
    payloadOffset += Uint32Array.BYTES_PER_ELEMENT;
    payloadView.setInt8(payloadOffset, General_Categories.get(general_category) ?? 0);
    payloadOffset += Uint8Array.BYTES_PER_ELEMENT;
}

const stream = createWriteStream("./UnicodeData.bin");
const write: (chunk: any, encoding?: BufferEncoding) => Promise<boolean> = promisify(stream.write.bind(stream));

await write(new Uint8Array(headerChunk));
await write(new Uint8Array(namesChunk.buffer));
await write(new Uint8Array(payloadChunk));
stream.close();
