"use strict"

module.exports = (adapter, event) => {
    let sequence_promise = adapter.cache.get(event.sequence);
    if (!sequence_promise) {
        sequence_promise = adapter.seq(event.sequence, event.role)
        .then(checkRoleAccess(event.role))
        .then(parse(adapter, event));
        adapter.cache.set(event.sequence, sequence_promise);
        return sequence_promise;
    }

    return sequence_promise.then(checkRoleAccess(event.role));
}

function Fn (adapter, sequence, index, fn_iri, role) {
    let fn_promise = adapter.cache.get(fn_iri);
    if (!fn_promise) {
        fn_promise = adapter.fn(fn_iri, role);
        adapter.cache.set(fn_iri, fn_promise);
    }

    return fn_promise.then((fn) => {
        sequence[0][index][0] = fn;
        return sequence;
    });
};

function checkRoleAccess (role) {
    return (sequence) => {
        if (sequence[1] && sequence[1].R && !sequence[1].R[role]) {
            return Promise.reject(new Error("Sorry, no access."));
        }
        return sequence;
    }
}

function parse (adapter, event) {
    return (sequence) => {
        const jobs = [];
        sequence[0].forEach((handler, index) => {

            jobs.push(Fn(adapter, sequence, index, handler[0], event.role));

            // state
            if (handler[1]) {
                handler[1] = getState(adapter, handler[1]);
            }

            // handler arguments
            if (handler[2]) {
                handler[2] = Object.freeze(handler[2]);
            }
        });

        // sequence arguments
        if (sequence[1] && sequence[1].A) {
            sequence[1].A = Object.freeze(sequence[1].A);
        }

        return Promise.all(jobs).then((values) => {
            return sequence;
        });
    }
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
