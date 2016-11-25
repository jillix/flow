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
| Type     | Subject    | Predicate | Object      |
| -------- | ---------- | --------- | ----------- |
| Instance | UID/IRI    | name      | InstName    |
|          | UID/IRI    | type      | InstType    |
|          | UID/IRI    | module    | UID/IRI     |
|          | UID/IRI    | roles     | RoleName    |
|          | UID/IRI    | event     | UID/IRI     |
| Listener | UID/IRI    | name      | EventName   |
|          | UID/IRI    | type      | EventType   |
|          | UID/IRI    | onEnd     | UID/IRI     |
|          | UID/IRI    | onError   | UID/IRI     |
| Handler  | UID/IRI    | next      | UID/IRI     |
|          | UID/IRI    | type      | HandlerType |
|          | UID/IRI    | args      | JSON-str    |
|          | UID/IRI    | instance  | UID/IRI     |
|          | UID/IRI    | once      | UID/IRI     |
|          | UID/IRI    | data      | UID/IRI     |
|          | UID/IRI    | stream    | UID/IRI     |
|          | UID/IRI    | emit      | UID/IRI     |

### License (MIT)
See [LICENSE](https://github.com/jillix/flow/blob/master/LICENSE) file.
