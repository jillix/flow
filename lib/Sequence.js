"use strict"

const Loader = require("./Loader");
const AccessDenied = new Error("Sorry, no access.");

function checkRoleAccess (role, sequence) {
    if (sequence[1] && sequence[1].R && !sequence[1].R[role]) {
        return false;
    }
    return true;
}

module.exports = (adapter, call, event, data) => {
    return Loader(adapter, event.sequence, (sequence) => {

        if (checkRoleAccess(event.role, sequence)) {
            return Promise.resolve([call, sequence, event, data]);
        } else {
            return Promise.reject(AccessDenied);
        }

    }, (resolve, sequence) => {
        resolve([call, sequence, event, data]);

    }, (loader) => {
        setImmediate(adapter.seq, event.sequence, event.role, (err, sequence) => {

            if (err) {
                return loader.reject(err);
            }

            if (!checkRoleAccess(event.role, sequence)) {
                return loader.reject(AccessDenied);
            }

            sequence = parse(adapter, loader, sequence, event);
            loader.resolve(sequence);
        });
    });
};

function parse (adapter, loader, sequence, event) {

    sequence[0].forEach((handler, index) => {
        // fn, state, args
        loader.wait.push(Fn(adapter, sequence, index, handler[0], event.role));

        if (handler[1]) {
            handler[1] = getState(adapter, handler[1]);
        }

        if (handler[2]) {
            handler[2] = Object.freeze(handler[2]);
        }
    });

    if (sequence[1] && sequence[1].A) {
        sequence[1].A = Object.freeze(sequence[1].A);
    }

    return sequence;
};

function Fn (adapter, sequence, index, fn_iri, role) {
    return Loader(adapter, fn_iri, (fn) => {
        sequence[0][index][0] = fn;
        return Promise.resolve(fn);

    }, (resolve, fn) => {
        sequence[0][index][0] = fn;
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
