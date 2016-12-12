"use strict"

const Parser = require("./Parser");
const Link = require("./Link");
const state_cache_prefix = "_st:";

module.exports = (scope, sequence_id, session, stream) => {

    session = session || {role: scope.env.defRole || '*'};

    let sequence = scope.cache.get(sequence_id);
    if (sequence) {
        return sequence.uncork(stream);
    }

    sequence = Sequence(scope, sequence_id, session, stream);
    scope.cache.set(sequence_id, sequence);

    const parser = Parser(scope, sequence, session);
    parser.on('finish', sequence.fin);
    parser.on('error', (err) => stream.emit('error', err));

    setImmediate(() => {
        const triples = scope.seq(scope, sequence_id, session);
        triples.on('error', (err) => stream.emit('error', err));
        triples.pipe(parser);
    });
};

function Sequence (scope, sequence_id, session, stream) {

    const sequence = {
        fns: 0,
        seq: {},
        roles: {},
        streams: [stream],
        set: (handler_id, type, value) => {

            // first handler in sequence
            if (handler_id === sequence_id && type === 'n') {
                handler_id = value;
                type = 'f';
                value = true;
            }

            sequence.seq[handler_id] = sequence.seq[handler_id] || {};

            if (type === 's') {
                value = getState(scope, value);
            }

            sequence.seq[handler_id][type] = value;
        },

        fn: (handler_id, err, fn, type) => {

            if (err) {
                stream.emit('error', err);
                scope.cache.del(sequence_id);
                return;
            }

            sequence.set(handler_id, type, fn);

            if (--sequence.fns === 0) {
                if (sequence.parsed) {
                    sequence.done();
                }
            };
        },

        done: () => {
            sequence.ready = true;
            sequence.streams.forEach(stream => sequence.uncork(stream));
        },

        fin: () => {
            sequence.parsed = true;
            if (sequence.fns < 1) {
                sequence.done();
            }
        },

        uncork: (stream) => {
            if (sequence.ready) {
                Link(scope, sequence.seq, sequence.end, sequence.err, stream);
                stream.uncork();
            } else {
                sequence.streams.push(stream);
            }
        } 
    };

    return sequence;
};

function getState (scope, state_id) {
    let state = scope.cache.get(state_cache_prefix + state_id);
    if (state) {
        return state;
    }

    state = {};
    scope.cache.set(state_cache_prefix + state_id, state);
    return state;
}
