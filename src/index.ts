import { Stream } from "node:stream"
import { createInterface } from "node:readline"
import { createWriteStream } from "node:fs";

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

const General_Categorys = {
    "Lu": 1,
    "Ll": 2,
    "Lt": 3,

    "Lm": 4,
    "Lo": 5,

    "Mn": 6,
    "Mc": 7,
    "Me": 8,

    "Nd": 9,
    "Nl": 10,
    "No": 11,

    "Pc": 12,
    "Pd": 13,
    "Ps": 14,
    "Pe": 15,
    "Pi": 16,
    "Pf": 17,
    "Po": 18,

    "Sm": 19,
    "Sc": 20,
    "Sk": 21,
    "So": 22,

    "Zs": 23,
    "Zl": 24,
    "Zp": 25,

    "Cc": 26,
    "Cf": 27,
    "Cs": 28,
    "Co": 29,
    "Cn": 30

} as const;

const chunk = new Uint8Array(Uint8Array.BYTES_PER_ELEMENT * 5);
const view = new DataView(chunk.buffer);

const stream = createWriteStream("./UnicodeData.bin");
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
    ] = line.split(";") as [string, string, keyof typeof General_Categorys, ...string[]];

    const codePoint = Number.parseInt(code_value, 16);
    view.setUint32(0, codePoint);
    view.setInt8(4, General_Categorys[general_category] ?? 0);

    await new Promise<void>(function(resolve, reject) {
        stream.write(chunk, function(err) {
            if (err) reject(err);
            resolve();
        });
    })
}
stream.end();