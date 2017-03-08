"use strict"

const Loader = require("./Loader");
const vocab = "<http://schema.jillix.net/vocab/";

module.exports = (adapter, call, event, data) => {
    return Loader(adapter, event.sequence, (sequence) => {
        if (sequence.roles[event.role]) {
            return Promise.resolve([call, sequence, event, data]);
        } else {
            return Promise.reject(new Error('Flow: Sorry, no access. Roles:' + Object.keys(sequence.roles) + ' Role:' + event.role));
        }

    }, (resolve, sequence) => {
        resolve([call, sequence, event, data]);

    }, (loader) => {

        const sequence = {
            id: event.sequence,
            roles: {},
            args: {}
        };

        setImmediate(() => {
            const triples = adapter.seq(adapter, event.sequence, event.role);
            triples.on("end", () => {
                sequence.args = Object.freeze(sequence.args);
                loader.resolve(sequence);
            });
            triples.on("error", (err) => {loader.reject(err)});
            triples.on("data", (triple) => {
                let subject = triple[0];
                let predicate = triple[1];
                let object = triple[2];
                switch (predicate) {
                    case vocab + 'error>':
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
                            object = JSON.parse(object);
                            if (subject === sequence.id) {
                                sequence.args = Object.assign(sequence.args, object);
                            } else {
                                setHandler(sequence, subject, 'args', Object.freeze(object));
                            }
                        } catch (err) {
                            return loader.reject(err);
                        }
                        break;
                    case vocab + 'state>':
                        setHandler(sequence, subject ,'state', getState(adapter, object));
                        break;
                    case vocab + 'fn>':
                        loader.wait.push(Fn(adapter, sequence, subject, object, event.role));
                        break;
                    default:
                        loader.reject(new Error('[Parser] Unknown triple: ' + predicate));
                }
            });
        });
    });
};

function Fn (adapter, sequence, handler_id, fn_iri, role) {
    return Loader(adapter, fn_iri, (fn) => {
        setHandler(sequence, handler_id, "fn", fn);
        return Promise.resolve(fn);

    }, (resolve, fn) => {
        setHandler(sequence, handler_id, "fn", fn);
        resolve(fn);

    }, (loader) => {
        adapter.fn(fn_iri, role, (err, fn) => {
            if (err) {
                return loader.reject(err);
            }
            loader.resolve(fn);
        });
    });
};

function getState (adapter, state_id) {
    let state = adapter.cache.get(state_id);
    if (state) {
        return state;
    }

    state = {};
    adapter.cache.set(state_id, state);
    return state;
}

function setHandler (seq, handler, key, value) {
    seq[handler] = seq[handler] || {};
    seq[handler][key] = value;
}
