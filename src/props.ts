import { Stream } from "node:stream"
import { createInterface } from "node:readline"
import { createWriteStream } from "node:fs";
import { promisify } from "node:util";

async function* PropList(url: string){
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

const data: Map<string, [number, number][]> = new Map();;

for await (const line of PropList("https://unicode.org/Public/UCD/latest/ucd/PropList.txt")) {
    if (line.startsWith("#")) continue;
    if (line == "") continue;
    const semicolon = line.indexOf(";");
    let hash = line.indexOf("#");
    if (hash < 0) hash = line.length;

    const range = line.substring(0, semicolon).trim();
    const name = line.substring(semicolon + 1, hash).trim();
    
    let container = data.get(name);
    container ?? data.set(name, (container = []));
    
    if (range.includes("..")) {
        const [start, end] = range.split("..");
        container.push([Number.parseInt(start, 16), Number.parseInt(end, 16)]);
    } else {
        const point = Number.parseInt(range, 16);
        container.push([point, point]);
    }

}

const encoder = new TextEncoder();
const stram = createWriteStream("./PropList.bin");
const write: (chunk: any, encoding?: BufferEncoding) => Promise<boolean> = promisify(stram.write.bind(stram));

let namesOffset = 0, headerOffset = 0, payloadOffset = 0;


const headerChunk = new Uint32Array(3 * (data.size + 1));
const names = Object.fromEntries(Array.from(data.keys()).reduce(function(accum: [string, Uint8Array][], key) {
    accum.push([key, encoder.encode(`${key}\u0003`)]);
    return accum
}, []));
const namesChunk = new Uint8Array(Object.values(names).reduce((accum, val) => accum + val.byteLength, 0))
const payloadChunk = new Uint32Array(Array.from(data.values()).reduce((accum, val) => accum + val.length, 0) * 2);

for (const [name, ranges] of data) {

    const length = ranges.length * 2 * Uint32Array.BYTES_PER_ELEMENT;
    const payloadPointer = headerChunk.byteLength + namesChunk.byteLength + (payloadOffset * Uint32Array.BYTES_PER_ELEMENT);
    const namePointer = headerChunk.byteLength + (namesOffset * Uint8Array.BYTES_PER_ELEMENT);

    headerChunk[headerOffset++] = namePointer;
    headerChunk[headerOffset++] = payloadPointer;
    headerChunk[headerOffset++] = length;

    namesChunk.set(names[name], namesOffset);
    namesOffset += names[name].byteLength;

    for (const [start, end] of ranges) {
        payloadChunk[payloadOffset++] = start;
        payloadChunk[payloadOffset++] = end;
    }

}
await write(new Uint8Array(headerChunk.buffer));
await write(new Uint8Array(namesChunk.buffer));
await write(new Uint8Array(payloadChunk.buffer));
stram.close();