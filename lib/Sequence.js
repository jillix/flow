"use strict"

const Loader = require("./Loader");
const vocab = "<http://schema.jillix.net/vocab/";

module.exports = (scope, sequence_id, event) => {
    return Loader(scope, sequence_id, (sequence) => {
        if (sequence.roles[event.role]) {
            return Promise.resolve([event, sequence]);
        } else {
           return Promise.reject(new Error('Flow: Sorry, no access. Roles:' + Object.keys(sequence.roles) + ' Role:' + event.role));
        }

    }, (resolve, sequence) => {
        resolve([event, sequence]);

    }, (loader) => {

        const sequence = {
            id: sequence_id,
            roles: {}
        };

        setImmediate(() => {
            const triples = scope.seq(scope, sequence_id, event.role);
            triples.on('end', () => {loader.resolve(sequence)});
            triples.on('error', (err) => {loader.reject(err)});
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
                            return loader.reject(err);
                        }
                        break;
                    case vocab + 'state>':
                        setHandler(sequence, subject ,'state', getState(scope, object));
                        break;
                    case vocab + 'fn>':
                        loader.wait.push(Fn(scope, sequence, subject, object, event.role));
                        break;
                    default:
                        loader.reject(new Error('[Parser] Unknown triple: ' + predicate));
                }
            });
        });
    });
};

function Fn (scope, sequence, handler_id, fn_iri, role) {
    return Loader(scope, fn_iri, (fn) => {
        setHandler(sequence, handler_id, "fn", fn);
        return Promise.resolve(fn);

    }, (resolve, fn) => {
        setHandler(sequence, handler_id, "fn", fn);
        resolve(fn);

    }, (loader) => {
        scope.fn(fn_iri, role, (err, fn) => {
            if (err) {
                return loader.reject(err);
            }
            loader.resolve(fn);
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
