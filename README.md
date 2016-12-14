# flow
Configurable stream networks

### Installation
With NPM: `npm install jillix/flow`.

### Usage
```js
cosnt Flow = require('flow');

// Initialize flow with evn and adapter object
const flow = Flow(

    // An read only object, that every method has access to (scope.env).
    {env: "vars"},
    
    // The adapter object containing mandatory methods (`fn`, `seq`, `cache.get`, `cache.set`, `cache.del`).
    // `reset` is the only optional method.
    {
        cache: {
            get: (key) => {},
            set: (key, value) => {},
            del: (key) => {}
        },

        // this method must return a reference to a function.
        fn: function (method_iri, callback) {
            // .. get a function, ex. require(module_name)[exported_fn]
            callback(null, fn);
        },

        // return a readable triple stream
        seq: function (name) {
            // .. return triples of a sequence (see: Flow Network RDF)
        }

        // custom reset handler
        reset: function () {
            // .. reset stuff, ex. DOM
        }
    }
);

const duplex = flow('event_id|iri');
duplex.on('error', (err) => {});
duplex.on('data', (chunk) => {});
duplex.write('chunk');
duplex.end('chunk');
```
### Data handler
Data handler receive the data chunks, that are send over the stream.
Data handlers are ment to transform the chunks and pass it down the line.
```js
exports.myMethod = function (scope, state, args, data, next, stream, enc) {
    
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
exports.myMethod = function (scope, state, args, stream) {

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
#####Required for flow
Note: `xds:string` triple must not be in the sequence result, but it's object -> `"string"`. 
| Subject-Type  | Subject  | Predicate      | Object     | Object-Type     |
| ------------- | -------- | -------------- | -----------| --------------- |
| Sequence      | `_:UID`  | role           | `_:HASH`   | String          |
| Sequence      | `_:UID`  | onEnd          | `_:UID`    | Sequence        |
| Sequence      | `_:UID`  | onError        | `_:UID`    | Sequence        |
| Sequence      | `_:UID`  | next           | `_:UID`    | Handler         |
| Handler       | `_:UID`  | args           | `_:UID`    | Object          |
| Handler       | `_:UID`  | state          | `_:HASH`   | String          |
| Handler       | `_:UID`  | data           | `<IRI>`    | Method          |
| Handler       | `_:UID`  | stream         | `<IRI>`    | Method          |
| Handler       | `_:UID`  | emit           | `_:UID`    | Sequence        |
| Handler       | `_:UID`  | next           | `_:UID`    | Handler         |
| Object        | `_:UID`  | json           | `_:HASH`   | String          |
| *String*      | `_:HASH` | *xsd:string*   | `"string"` | *UTF-8 Enc*     |

#####Required for an adapter
| Subject-Type  | Subject  | Predicate      | Object     | Object-Type     |
| ------------- | -------- | -------------- | -----------| --------------- |
| Entrypoint    | `_:UID`  | name           | `_:HASH`   | String          |
| Entrypoint    | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Entrypoint    | `_:UID`  | environment    | `_:UID `   | Object          |
| Entrypoint    | `_:UID`  | sequence       | `_:UID`    | Sequence        |

#####Used for visualization
| Subject-Type  | Subject  | Predicate      | Object     | Object-Type     |
| ------------- | -------- | -------------- | -----------| --------------- |
| Network       | `_:UID`  | name           | `_:HASH`   | String          |
| Network       | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Network       | `_:UID`  | entrypoint     | `_:UID`    | Entrypoint      |
| Sequence      | `_:UID`  | name           | `_:HASH`   | String          |
| Sequence      | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Sequence      | `_:UID`  | handler        | `_:UID`    | Handler         |
| Handler       | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Method        | `<IRI>`  | descriptor     | `_:HASH`   | String          |
| Object        | `_:UID`  | name           | `_:HASH`   | String          |
| Object        | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Object        | `_:UID`  | emit           | `_:UID`    | Sequence        |

### License (MIT)
See [LICENSE](https://github.com/jillix/flow/blob/master/LICENSE) file.
