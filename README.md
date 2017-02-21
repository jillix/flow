# flow
Configurable stream networks

### Installation
With NPM: `npm install jillix/flow`.

### Usage
```js
const Flow = require('flow');

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

// With data stream
const stream = flow('_:sequence_id', {event: "data"}, true);
stream.on('error', (err) => {});
stream.on('data', (chunk) => {});
stream.write('chunk');
stream.end('chunk');

// Without data stream
const event = flow('_:sequence_id', {event: "data"});
event.done = (err, data, stream) => {
    console.log(err, data);
};
```
### Handler
Handlers are called in order on a sequence.
```js
exports.myMethod = function (scope, state, args, data, stream, next) {

    // Pipe a transform stream
    next(null, data, stream.pipe(myTransformStream);
    
    // ..or write to a Writable stream
    stream.pipe(myWritableStream);
    next(null, data, stream);
    
    // ..or create a new Readable stream
    next(null, data, myReadableStream);

    // Pass transformed data to the next data handler.
    next(null, changeDataSomeHow(data), stream);
    
    // Emit error. This will stop the sequence
    next(new Error('Something bad happend.'));
};
```
###Flow Network (RDF)
Note: `xds:string` triple must not be in the sequence result, but it's object -> `"string"`. 
#####Required for flow
| Subject-Type  | Subject  | Predicate      | Object     | Object-Type      |
| ------------- | -------- | -------------- | -----------| ---------------- |
| Sequence      | `_:UID`  | role           | `_:HASH`   | String           |
| Sequence      | `_:UID`  | onEnd          | `_:UID`    | Sequence         |
| Sequence      | `_:UID`  | onError        | `_:UID`    | Sequence         |
| Sequence      | `_:UID`  | next           | `_:UID`    | Data/Stream/Emit |
| Data          | `_:UID`  | type           | `<IRI>`    | RDF Type         |
| Data          | `_:UID`  | fn             | `<IRI>`    | Function         |
| Data          | `_:UID`  | state          | `_:HASH`   | String           |
| Data          | `_:UID`  | args           | `_:UID`    | Arguments        |
| Data          | `_:UID`  | next           | `_:UID`    | Data/Stream/Emit |
| Stream        | `_:UID`  | type           | `<IRI>`    | RDF Type         |
| Stream        | `_:UID`  | fn             | `<IRI>`    | Function         |
| Stream        | `_:UID`  | state          | `_:HASH`   | String           |
| Stream        | `_:UID`  | args           | `_:UID`    | Arguments        |
| Stream        | `_:UID`  | next           | `_:UID`    | Data/Stream/Emit |
| Emit          | `_:UID`  | type           | `<IRI>`    | RDF Type         |
| Emit          | `_:UID`  | sequence       | `_:UID`    | Sequence         |
| Emit          | `_:UID`  | next           | `_:UID`    | Data/Stream/Emit |
| Arguments     | `_:UID`  | json           | `_:HASH`   | String           |
| *String*      | `_:HASH` | *xsd:string*   | `"string"` | *UTF-8 Enc*      |

#####Required for an adapter
| Subject-Type  | Subject  | Predicate      | Object     | Object-Type     |
| ------------- | -------- | -------------- | -----------| --------------- |
| Entrypoint    | `_:UID`  | name           | `_:HASH`   | String          |
| Entrypoint    | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Entrypoint    | `_:UID`  | sequence       | `_:UID`    | Sequence        |
| Entrypoint    | `_:UID`  | environment    | `_:UID`    | Environment     |
| Environment   | `_:UID`  | json           | `_:HASH`   | String          |

#####Used for visualization
| Subject-Type  | Subject  | Predicate      | Object     | Object-Type     |
| ------------- | -------- | -------------- | -----------| --------------- |
| Network       | `_:UID`  | name           | `_:HASH`   | String          |
| Network       | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Network       | `_:UID`  | entrypoint     | `_:UID`    | Entrypoint      |
| Environment   | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Environment   | `_:UID`  | name           | `_:HASH`   | String          |
| Sequence      | `_:UID`  | name           | `_:HASH`   | String          |
| Sequence      | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Sequence      | `_:UID`  | handler        | `_:UID`    | Handler         |
| Data          | `_:UID`  | name           | `_:HASH`   | String          |
| Stream        | `_:UID`  | name           | `_:HASH`   | String          |
| Emit          | `_:UID`  | name           | `_:HASH`   | String          |
| Arguments     | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Arguments     | `_:UID`  | name           | `_:HASH`   | String          |
| Arguments     | `_:UID`  | emit           | `_:UID`    | Sequence        |
| Function      | `<IRI>`  | descriptor     | `_:HASH`   | String          |

### License (MIT)
See [LICENSE](https://github.com/jillix/flow/blob/master/LICENSE) file.
