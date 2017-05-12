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

        seq: function (sequenceId, role, callback) {
            // Return a flow sequence object or an error in the callback.
            callback(null, {/*See #flow sequence*/});
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
### Flow sequence (JSON)
The adapter method `adapter.seq` must return a flow sequence object.
```js
[
    // sequence of handlers
    [
        // sequence handler
        ["owner/module/version/fn", "state", {"some":"args"}]
    ],

    // sequence options
    {
        // arguements accessable in `event.args`
        "A": {"sequence": "args"},

        // roles for basic access check
        "R": {"RoleId": true},

        // emit error as data to another sequence
        "E": "errorSequence"
    }
]
```
### Flow Network (RDF)
| Subject-Type  | Subject  | Predicate      | Object     | Object-Type |
| ------------- | -------- | -------------- | -----------| ----------- |
| Sequence      | `_:UID`  | role           | `_:HASH`   | String      |
| Sequence      | `_:UID`  | error          | `_:UID`    | Sequence    |
| Sequence      | `_:UID`  | args           | `_:UID`    | Arguments   |
| Sequence      | `_:UID`  | next           | `_:UID`    | Next        |
| Sequence      | `_:UID`  | name           | `_:HASH`   | String      |
| Sequence      | `_:UID`  | type           | `<IRI>`    | RDF Type    |
| Next          | `_:UID`  | type           | `<IRI>`    | RDF Type    |
| Next          | `_:UID`  | handler        | `<IRI>`    | Handler     |
| Next          | `_:UID`  | state          | `_:HASH`   | String      |
| Next          | `_:UID`  | args           | `_:UID`    | Arguments   |
| Next          | `_:UID`  | next           | `_:UID`    | Next        |
| Next          | `_:UID`  | name           | `_:HASH`   | String      |
| Arguments     | `_:UID`  | json           | `_:HASH`   | String      |
| Arguments     | `_:UID`  | type           | `<IRI>`    | RDF Type    |
| Arguments     | `_:UID`  | name           | `_:HASH`   | String      |
| Arguments     | `_:UID`  | emit           | `_:UID`    | Sequence    |
| *String*      | `_:HASH` | *xsd:string*   | `"string"` | *UTF-8 Enc* |
| Handler       | `<IRI>`  | descriptor     | `_:HASH`   | String      |
### MIT License
See [LICENSE](https://github.com/jillix/flow/blob/master/LICENSE) file.
