"use strict"

const EventEmitter = require("events");
const vocab = "<http://schema.jillix.net/vocab/";

module.exports = (scope, sequence_id, event) => {

    const sequence = scope.cache.get(sequence_id);
    if (sequence) {

        // wait till sequence is loaded
        if (sequence.loading) {
            return new Promise((resolve, reject) => {
                sequence.once("reject", reject);
                sequence.once("resolve", (sequence) => {
                    resolve([event, sequence]);
                });
            });

        // resolve promise if event role has accesses to event
        } else if (sequence.roles[event.role]) {
            return Promise.resolve([event, sequence]);

        // reject promise
        } else {
           return Promise.reject(new Error('Flow: Sorry, no access. Roles:' + Object.keys(sequence.roles) + ' Role:' + event.role));
        }
    }

    return new Promise((resolve, reject) => {

        const loader = new EventEmitter();
        loader.loading = true;
        loader.wait = [];
        loader.once("reject", (err) => {
            scope.cache.del(sequence_id);
            reject(err);
        });
        loader.once("resolve", (sequence) => {
            scope.cache.set(sequence_id, sequence);
            resolve([event, sequence]);
        });
        scope.cache.set(sequence_id, loader);

        const sequence = {
            id: sequence_id,
            roles: {}
        };

        setImmediate(() => {
            const triples = scope.seq(scope, sequence_id, event.role);
            triples.on('end', () => {
                if (loader.wait.length) {
                    Promise.all(loader.wait)
                    .then(() => {loader.emit("resolve", sequence)})
                    .catch((err) => {loader.emit("reject", err)});
                } else {
                    loader.emit("resolve", sequence);
                }
            });
            triples.on('error', (err) => {loader.emit("reject", err)});
            triples.on("data", (triple) => {

                let subject = triple[0] || triple.subject;
                let predicate = triple[1] || triple.predicate;
                let object = triple[2] || triple.object;

                switch (predicate) {

                    case vocab + 'onError>':
                        sequence.err = object;
                        break;

                    case vocab + 'role>':
                        sequence.roles[object] = true;
                        break; 

                    case vocab + 'next>':
                        if (subject === sequence.id) {
                            sequence.first = object;
                        } else {
                            setHandler(sequence, subject, 'next', object);
                        }
                        break;

                    case vocab + 'args>':
                        try {
                            setHandler(sequence, subject, 'args', Object.freeze(JSON.parse(object)));
                        } catch (err) {
                            return loader.emit("reject", err);
                        }
                        break;

                    case vocab + 'state>':
                        setHandler(sequence, subject ,'state', getState(scope, object));
                        break;

                    case vocab + 'fn>':
                        loader.wait.push(Fn(scope, sequence, subject, object, event.role));
                        break;

                    default:
                        reject(new Error('[Parser] Unknown triple: ' + predicate));
                }
            });
        });
    });
};

function Fn (scope, sequence, handler_id, fn_iri, role) {

    const fn = scope.cache.get(fn_iri);
    if (fn) {

        // wait till sequence is loaded
        if (fn.loading) {
            return new Promise((resolve, reject) => {
                fn.once("resolve", (fn) => {
                    setHandler(sequence, handler_id, "fn", fn);
                    resolve(fn);
                });
                fn.once("reject", reject);
            });

        // resolve promise if event role has accesses to event
        } else {
            setHandler(sequence, handler_id, "fn", fn);
            return Promise.resolve(fn);
        }
    }

    return new Promise((resolve, reject) => {

        const loader = new EventEmitter();
        loader.loading = true;
        loader.wait = [];
        loader.once("reject", (err) => {
            scope.cache.del(fn_iri);
            reject(err);
        });
        loader.once("resolve", (fn) => {
            setHandler(sequence, handler_id, "fn", fn);
            scope.cache.set(fn_iri, fn);
            resolve(fn);
        });
        scope.cache.set(fn_iri, loader);

        scope.fn(fn_iri, role, (err, fn) => {

            if (err) {
                return loader.emit("reject", err);
            }

            loader.emit("resolve", fn);
        });
    });
};

function getState (scope, state_id) {
    let state = scope.cache.get(state_id);
    if (state) {
        return state;
    }

    state = {};
    scope.cache.set(state_id, state);
    return state;
}

function setHandler (seq, handler, key, value) {
    seq[handler] = seq[handler] || {};
    seq[handler][key] = value;
}
