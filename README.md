# flow
Network of event driven subroutines.

### Installation
With NPM: `npm install jillix/flow`.

### Usage
```js
// Just require or load the file and it will create a Global named "Flow".
require('flow');

// Initialize flow with an adapter object.
// The adapter object MUST contain the methods (`fn`, `seq`, `cache.get`, `cache.set`, `cache.del`).
Flow({
    cache: {
        get: (key) => {},
        set: (key, value) => {},
        del: (key) => {}
    },

    // this method must resolve a reference to a function.
    fn: function (method_iri) {
        // ex: require(module_name)[exported_fn]
        return Promise((resolve, reject) => {
            resolve(fn_ref);
        })
    },

    // Resolve a flow sequence object or reject with an error.
    seq: function (sequenceId, role) {
        return Promise((resolve, reject) => {
            resolve({/*See #flow sequence*/});
        });
    }
});

// emit a flow sequence
const config = {
    sequence: "sequenceId",

    // Call a sequence with a role
    role: "whatEverRoleStringYouSavedTheSequence"

    // TODO force a reload of the sequence (dev)
    reload: true
};

// Pass a options object or the sequence-id directly as a string, to emit a sequence.
Flow("sequenceId" || config, {event: "data"})
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
module.exports = (event, args, state, data, resolve, reject) => {

    // Sequence args are valid for all handlers in a sequence. ex:
    httpServer.listen(event.args.port);

    // Handler args are readonly static infos. ex:
    validate(args.type, data);

    // state is shared between handlers. ex:
    if (state.active) {
        state.active = false;
    }

    // data is emited with a event. ex:
    data.req = data.req.pipe(iamWritable);

    // resolve handler without overwrite
    resolve();

    // overwrite data, will be the input of the next handler
    resolve({other: "data"});

    // hanlde an error
    reject(new Error("Oh my!"));
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
### MIT License
See [LICENSE](https://github.com/jillix/flow/blob/master/LICENSE) file.
