# flow
Network of event driven subroutines.

### Installation
With NPM: `npm install jillix/flow`.

### Usage
```js
// Just require or load the file and it will create a Global named "Flow".
require('flow');

// Initialize flow with an adapter object.
// The adapter object MUST contain the methods:
// (`fn`, `seq`, `get`, `set`, `del`).
// The Application Base Path (`abp`) will be added to all events of this adapter instance.
// The first time "Flow()" gets called, the adapter gets initialized.
// After that "Flow()" will just emit sequences.
Flow({
    abp: "[application_base_path]",
    get: (key) => {},
    set: (key, value) => {},
    del: (key) => {},

    // load a handler method
    fnc: (method_iri) => {
        return Promise((resolve, reject) => {
            // Resolve must happen in the next event loop cycle otherwise there
            // will be a "Chaining cycle detected for promise" error.
            process.nextTick(resolve);
        })
    },

    // Resolve a flow sequence object
    seq: (sequenceId, role) => {
        return Promise((resolve, reject) => {
            resolve({/*See #flow sequence*/});
        });
    },

    // load a dependency
    dep: (dependency) => {
        return Promise((resolve, reject)) => {
            resolve();
        }
    }
});

// Emit a flow sequence
Flow("sequenceId", {input: "data"})
.then((output) => {
    // ..handle output
})
.catch((err) => {
    // ..handle an error
});
```
### Handler
Handlers are called in order on a sequence.
```js
Flow.set("owner.handlerName.major.minor.patch-feature",(()=>{
    "use strict"

    return (state, input, resolve, reject) => {

        // Emit another sequence
        const sequencePromise = Flow("otherSequence", inputData);

        // Resolve with a Promise
        resolve(sequencePromise);

        // Resolve with data
        resolve({other: "data"});

        // Resolve without data
        resolve();

        // handle an error
        reject(new Error("Oh my!"));
    };

})());
```
### Flow sequence (JSON)
The adapter method `adapter.seq` must return a flow sequence object.
```js
[
    // sequence of handlers
    [
        // sequence handler
        [
            "publicid/path/to/fn",
            "state",
            {"some":"args"},

            // handler input config
            0-2                     // set handler input to source
            [0-2, "out.Key"]        // set handler input to source[out.key]
            [                       // set handler input from list of sources
                0-2                 // set handler input to source
                [0-2, "out.Key"]    // set handler input to source[out.key]
            ]
            [                       // set handler input[in.key] in order
                [
                    "in.Key",
                    0-2 | [0-2, "out.Key"] | [0-2 | [0-2, "out.Key"]]   //(same as handler input config)
                ]
            ]

            // handler output config
            0                           // ignore output
            1                           // overwrite input with output
            "out.Key"                   // overwrite input with output[out.key]
            [
                ["in.Key", 1]           // set input.key with output
                ["in.Key", "out.Key"]   // set input.key with output[out.key]
            ]
        ]
    ],

    // options
    {
        // arguements accessable in `event.args`
        "A": {"sequence": "args"},

        // dependency list (same as npm dependencies)
        "D": {
            "dependency-name": "version"
        }

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
| Next          | `_:UID`  | input          | `_:UID`    | Input       |
| Next          | `_:UID`  | output         | `_:UID`    | Output      |
| Next          | `_:UID`  | next           | `_:UID`    | Next        |
| Next          | `_:UID`  | name           | `_:HASH`   | String      |
| Arguments     | `_:UID`  | json           | `_:HASH`   | String      |
| Arguments     | `_:UID`  | type           | `<IRI>`    | RDF Type    |
| Arguments     | `_:UID`  | name           | `_:HASH`   | String      |
| Arguments     | `_:UID`  | emit           | `_:UID`    | Sequence    |
| Input         | `_:UID`  | json           | `_:HASH`   | String      |
| Input         | `_:UID`  | type           | `<IRI>`    | RDF Type    |
| Input         | `_:UID`  | name           | `_:HASH`   | String      |
| Output        | `_:UID`  | json           | `_:HASH`   | String      |
| Output        | `_:UID`  | type           | `<IRI>`    | RDF Type    |
| Output        | `_:UID`  | name           | `_:HASH`   | String      |
| *String*      | `_:HASH` | *xsd:string*   | `"string"` | *UTF-8 Enc* |
### MIT License
See [LICENSE](https://github.com/jillix/flow/blob/master/LICENSE) file.
