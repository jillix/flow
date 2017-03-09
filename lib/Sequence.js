"use strict"

const Loader = require("./Loader");

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
        setImmediate(() => {
            parse(adapter, loader, {
                id: event.sequence,
                roles: {},
                args: {}
            }, event, adapter.seq(adapter, event.sequence, event.role));
        });
    });
};

function parse (adapter, loader, sequence, event, triples) {

    triples.on("error", (err) => {loader.reject(err)});
    triples.on("end", () => {
        sequence.args = Object.freeze(sequence.args);
        loader.resolve(sequence);
    });

    triples.on("data", (triple) => {
        switch (triple[1]) {
            case "F":
                loader.wait.push(Fn(adapter, sequence, triple[0], triple[2], event.role));
                break;
            case "A":
                try {
                    triple[2] = JSON.parse(triple[2]);
                    if (triple[0] === sequence.id) {
                        sequence.args = Object.assign(sequence.args, triple[2]);
                    } else {
                        setHandler(sequence, triple[0], 'args', Object.freeze(triple[2]));
                    }
                } catch (err) {
                    return loader.reject(err);
                }
                break;
            case "S":
                setHandler(sequence, triple[0] ,'state', getState(adapter, triple[2]));
                break;
            case "E":
                sequence.err = triple[2];
                break;
            case "R":
                sequence.roles[triple[2]] = true;
                break; 
            case "N":
                if (triple[0] === sequence.id) {
                    sequence.first = triple[2];
                } else {
                    setHandler(sequence, triple[0], 'next', triple[2]);
                }
                break;
            default:
                loader.reject(new Error('[Parser] Unknown triple: ' + triple[1]));
        }
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
