"use strict"

const Parser = require("./Parser");
const Link = require("./Link");

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
        const triples = scope.seq(sequence_id, session);
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
        get: (handler_iri) => {
            return sequence.seq[handler_iri] = sequence.seq[handler_iri] || {};
        },
        uncork: (stream) => {
            if (sequence.ready) {
                Link(scope, sequence.seq, sequence.onEnd, sequence.onError, stream);
                stream.uncork();
            } else {
                sequence.streams.push(stream);
            }
        },
        fn: (handler_id, err, fn, type) => {

            if (err) {
                stream.emit('error', err);
                scope.cache.del(sequence_id);
                return;
            }

            sequence.get(handler_id)[type] = fn;

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
        }
    };

    return sequence;
};

function getState (scope, state_id) {

    let state = scope.cache.get(state_id);
    if (state) {
        return state;
    }

    state = {_id: state_id};
    scope.cache.set(state_id, state);
    return state;
};
