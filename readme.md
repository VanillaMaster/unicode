## UnicodeData
```
struct category {
    // pointer to utf-8 encoded string terminated by "END OF TEXT" (\u0003);
    void* name;
    uint8 id;
}

// goes till the end of data
struct table {
    uint32 codePoint;
    uint8 categoryID;
}

struct header {
    table* data;
    category[] categories;
}
```
* header placed at start of file;
* every pointer is uint32;

## PropList
```
struct range {
    uint32 start;
    uint32 end;
}

struct table {
    range[] ranges;
}

struct record {
    // pointer to utf-8 encoded string terminated by "END OF TEXT" (\u0003);
    void* name;
    table* data;
    uint32 dataSize;
}

struct header {
    record[] records;
}
```
* header placed at start of file;
* every pointer is uint32;