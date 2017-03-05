# flow
Configurable stream networks

### Installation
With NPM: `npm install jillix/flow`.

### Usage
```js
const Flow = require('flow');

// Initialize flow with evn and adapter object
const flow = Flow(
    
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
    }
);

// emit a flow sequence
const event = flow('sequence_id', {event: "data"}, (err, data) => {
    // ..on sequence complete handler (optional)
});

// event is a duplex stream
event.on('error', (err) => {});
event.on('data', (chunk) => {});
event.write('chunk');
evemt.end('chunk');
```
### Handler
Handlers are called in order on a sequence.
```js
exports.myMethod = function (event, state, args, next) {

    // continue with no modifications
    next();
    
    // pass an error and break the sequence
    next(new Error('Oh my!'));

    const data = event.data;
    const stream = event.output;
    
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
| Sequence      | `_:UID`  | next           | `_:UID`    | Handler          |
| Handler       | `_:UID`  | type           | `<IRI>`    | RDF Type         |
| Handler       | `_:UID`  | fn             | `<IRI>`    | Function         |
| Handler       | `_:UID`  | state          | `_:HASH`   | String           |
| Handler       | `_:UID`  | args           | `_:UID`    | Arguments        |
| Handler       | `_:UID`  | next           | `_:UID`    | Handler          |
| Arguments     | `_:UID`  | json           | `_:HASH`   | String           |
| *String*      | `_:HASH` | *xsd:string*   | `"string"` | *UTF-8 Enc*      |

#####Used for visualization
| Subject-Type  | Subject  | Predicate      | Object     | Object-Type     |
| ------------- | -------- | -------------- | -----------| --------------- |
| Network       | `_:UID`  | name           | `_:HASH`   | String          |
| Network       | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Network       | `_:UID`  | entrypoint     | `_:UID`    | Entrypoint      |
| Sequence      | `_:UID`  | name           | `_:HASH`   | String          |
| Sequence      | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Sequence      | `_:UID`  | handler        | `_:UID`    | Handler         |
| Handler       | `_:UID`  | name           | `_:HASH`   | String          |
| Arguments     | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Arguments     | `_:UID`  | name           | `_:HASH`   | String          |
| Arguments     | `_:UID`  | emit           | `_:UID`    | Sequence        |
| Function      | `<IRI>`  | descriptor     | `_:HASH`   | String          |

### License (MIT)
See [LICENSE](https://github.com/jillix/flow/blob/master/LICENSE) file.
