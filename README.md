# flow
Configurable stream networks

### Installation
With NPM: `npm install jillix/flow`.

### Usage
```js
cosnt Flow = require('flow');

// Initialize flow with adapter object
const flow = Flow({

    cache: {
        get: (key) => {},
        set: (key, value) => {},
        del: (key) => {}
    },
    
    // this method must return a CommonJs exports object.
    mod: function (name, callback) {
        // .. get the module, ex. require(name)
        callback(null, module);
    },

    // return a flow module instance composition (mic)
    read: function (name) {
        // .. return a triple stream of a event
    }

    // custom reset handler
    reset: function () {
        // .. reset stuff, ex. DOM
    }
});

const event = flow('event_id|iri');
event.on('error', (err) => {});
event.on('data', (chunk) => {});
event.write('chunk');
event.end('chunk');
```
### Data handler
Data handler receive the data chunks, that are send over the stream.
Data handlers are ment to transform the chunks and pass it down the line.
```js
exports.myMethod = function (scope, inst, args, data, next, stream, enc) {
    
    // Push data to next handler (you have to call "next()", to signal that the handler is done).
    stream.push(data);
    
    // Pass transformed data to the next data handler.
    next(null, data);
    
    // Emit an error, stream will end
    next(new Error('Something bad happend.'));
};
```
### Stream handler
Stream handler receive the previous stream in the the event chain and can also
return a duplex/transform or readable stream, which gets piped into the chain.
```js
exports.myMethod = function (scope, inst, args, stream) {

    // read from flow event
    stream.pipe(otherWritableStream);
    return;
    
    // ..or, write to flow event (return a readable stream)
    
    // TODO hmm.. check this, probably not true anymore 
    // Note: A readable stream overwrites the output of the flow event.
    // Which means that if you call a stream handler, that returns
    // a readable stream, more then once. Only the chunks of the last
    // readable stream will be emitted as flow data chunks.
    return fs.createReadStream('file');
    
    // ..or, read from flow event (return a writable stream)
    return fs.createWriteStream('file');
    
    // ..or, transform flow event data (return a duplex stream)
    return zlib.createGzip();
};
```
###Flow Network (RDF)
| Subject-Type | Subject  | Predicate  | Object     | Object-Type |
| ------------ | -------- | ---------  | -----------| ----------- |
| Sequence     | `_:UID`  | name       | `_:HASH`   | String      |
| Sequence     | `_:UID`  | type       | `<IRI>`    | RDF Type    |
| Sequence     | `_:UID`  | role       | `_:HASH`   | String      |
| Sequence     | `_:UID`  | onEnd      | `_:UID`    | Sequence    |
| Sequence     | `_:UID`  | onError    | `_:UID`    | Sequence    |
| Sequence     | `_:UID`  | env-vars   | `_:HASH`   | JSON String |
| Sequence     | `_:UID`  | next       | `_:UID`    | Handler     |
| Handler      | `_:UID`  | type       | `<IRI>`    | RDF Type    |
| Handler      | `_:UID`  | args       | `_:HASH`   | JSON String |
| Handler      | `_:UID`  | state      | `_:HASH`   | String      |
| Handler      | `_:UID`  | data       | `<IRI>`    | Method      |
| Handler      | `_:UID`  | stream     | `<IRI>`    | Method      |
| Handler      | `_:UID`  | emit       | `_:UID`    | Sequence    |
| Handler      | `_:UID`  | next       | `_:UID`    | Handler     |
| Method       | `<IRI>`  | descriptor | `_:HASH`   | JSON String |
| Hashed       | `_:HASH` | TEXT       | **String** | UTF-8 Enc   |
| Hashed       | `_:HASH` | JSON       | **String** | UTF-8 Enc   |

### License (MIT)
See [LICENSE](https://github.com/jillix/flow/blob/master/LICENSE) file.
