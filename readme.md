## UnicodeData
<!-- C++ just for highlighting -->
```C++
struct category {
    // pointer to utf-8 encoded string terminated by "END OF TEXT" (\u0003);
    void* name;
    UInt8 id;
}

// goes till the end of data
struct table {
    UInt32 codePoint;
    UInt8 categoryID;
}

struct header {
    table* data;
    category[] categories;
}
```
* header placed at start of file;
* every pointer is uint32;

## PropList
<!-- C++ just for highlighting -->
```C++
struct range {
    UInt32 start;
    UInt32 end;
}

struct table {
    range[] ranges;
}

struct record {
    // pointer to utf-8 encoded string terminated by "END OF TEXT" (\u0003);
    void* name;
    table* data;
    UInt32 dataSize;
}

struct header {
    record[] records;
}
```
* header placed at start of file;
* every pointer is uint32;
