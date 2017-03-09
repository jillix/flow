# flow
Configurable stream networks

### Installation
With NPM: `npm install jillix/flow`.

### Usage
```js
const Flow = require('flow');

// Initialize flow with evn and adapter object
const flow = Flow(
    
    // The adapter object MUST contain the methods (`fn`, `seq`, `cache.get`, `cache.set`, `cache.del`).
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
            // .. return a readable stream of triples (see: Flow Network RDF)
            // A triple must have the format: Array["subject", "F|A|S|E|R|N", "object"]
        }
    }
);

// emit a flow sequence
const eventOptions = {
    sequence: "sequenceId",
    objectMode: true,

    // The role is used just for the specified "eventOptions.sequence".
    role: "myRoleId"

    // TODO force a reload of the sequence
    reload: true
};

// Pass a options object or the sequence-id directly as a string, to emit a sequence.
const event = flow("sequenceId" || eventOptions, {event: "data"}, (err, data) => {
    // ..on sequence complete handler (optional)
});

// event is a duplex stream
event.on('error', (err) => {
    // ..handle an error
});
event.on('data', (chunk) => {
    // ..read data
});
event.write('chunk');
event.end('chunk');
```
### Handler
Handlers are called in order on a sequence.
```js
exports.myMethod = function (event, state, args, next) {

    // Read from event
    event.pipe(myWritable);

    // Pass a readable stream to next handler
    next(null, null, myReadable);

    // Transform example
    next(null, null, event.pipe(myDuplex));

    // Pass modified data
    next(null, changeDataSomehow(event.data));

    // Pass an error and break the sequence
    next(new Error('Oh my!'));

    // Continue with no modifications
    next();
};
```
###Flow Network (RDF)
Note: `xds:string` triple must not be in the sequence result, but it's object -> `"string"`. 
#####Required for flow
| Subject-Type  | Subject  | Predicate      | Object     | Object-Type      |
| ------------- | -------- | -------------- | -----------| ---------------- |
| Sequence      | `_:UID`  | role           | `_:HASH`   | String           |
| Sequence      | `_:UID`  | error          | `_:UID`    | Sequence         |
| Sequence      | `_:UID`  | args           | `_:UID`    | Arguments        |
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
| Sequence      | `_:UID`  | name           | `_:HASH`   | String          |
| Sequence      | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Sequence      | `_:UID`  | handler        | `_:UID`    | Handler         |
| Handler       | `_:UID`  | name           | `_:HASH`   | String          |
| Arguments     | `_:UID`  | type           | `<IRI>`    | RDF Type        |
| Arguments     | `_:UID`  | name           | `_:HASH`   | String          |
| Arguments     | `_:UID`  | emit           | `_:UID`    | Sequence        |
| Function      | `<IRI>`  | descriptor     | `_:HASH`   | String          |
### MIT License
See [LICENSE](https://github.com/jillix/flow/blob/master/LICENSE) file.
