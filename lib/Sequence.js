"use strict"

const Parser = require("./Parser");
const Emit = require("./Emit");

// TODO all errors from parsing and loading to done callback

module.exports = (scope, sequence_id, data, stream, role) => {

    let sequence = scope.cache.get(sequence_id);
    if (sequence) {
        //if (sequence.roles[role]) {
            sequence.call(data, stream);
        //} else {
            //stream.emit('error', new Error('Flow: Sorry, no access. Roles:' + Object.keys(sequence.roles) + ' Role:' + role));
        //}
        return stream;
    }

    // create a sequence
    sequence = Sequence(scope, sequence_id, data, stream, role);
    scope.cache.set(sequence_id, sequence);

    const parser = Parser(scope, sequence, role);
    const error = (err) => {};
    parser.on('finish', sequence.fin);
    parser.on('error', (err) => {
        scope.cache.del(sequence_id);
        stream.emit('error', err)
    });

    setImmediate(() => {
        const triples = scope.seq(scope, sequence_id, role);
        triples.on('error', (err) => stream.emit('error', err));
        triples.pipe(parser);
    });

    return stream;
};

function Sequence (scope, sequence_id, data, stream, role) {

    const sequence = {
        id: sequence_id,
        fns: 1,
        seq: {},
        roles: {},
        calls: [[data, stream]],

        done: () => {
            sequence.ready = true;
            sequence.calls.forEach(data => sequence.call(data[0], data[1]));
            delete sequence.calls;
        },

        fin: () => {
            sequence.parsed = true;
            if (--sequence.fns < 1) {
                sequence.done();
            }
        },

        call: (data, stream) => {
            if (sequence.ready) {
                Emit(scope, sequence, data, stream._i || stream, (err, data, _stream) => {

                    _stream = _stream || stream._i;
                    if (_stream && _stream.pipe) {
                        _stream.pipe(stream._o);
                        stream.uncork && stream.uncork();
                        err && stream.end();
                    }

                    // call stream done, for chaining
                    if (typeof stream.done === 'function') {
                        stream.done(err, data, stream);
                    } else if (err) {
                        stream.emit('error', err);
                    }

                    // emit error sequence
                    if (err && sequence.err) {
                        scope.flow(sequence.err, err);
                    }
                });
            } else {
                sequence.calls.push([data, stream]);
            }
        } 
    };

    return sequence;
};
