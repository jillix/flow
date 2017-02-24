"use strict"

const Parser = require("./Parser");

module.exports = (scope, sequence_id, role, done) => {

    // TODO finish promise implementation
    return new Promise((resolve, reject) => {});

    let sequence = scope.cache.get(sequence_id);
    if (sequence) {
        if (sequence.roles[role]) {
            sequence.call(done);
        } else {
            done(new Error('Flow: Sorry, no access. Roles:' + Object.keys(sequence.roles) + ' Role:' + role));
        }
        return;
    }

    // create a sequence
    sequence = Sequence(scope, sequence_id, role, done);
    scope.cache.set(sequence_id, sequence);

    const parser = Parser(scope, sequence, role);
    const error = (err) => {};
    parser.on('finish', sequence.fin);
    parser.on('error', (err) => {
        scope.cache.del(sequence_id);
        done(err);
    });

    setImmediate(() => {
        const triples = scope.seq(scope, sequence_id, role);
        triples.on('error', (err) => {
            scope.cache.del(sequence_id);
            done(err);
        });
        triples.pipe(parser);
    });
};

// TODO move to debug version
function seqErr (msg, sequence) {
    sequence.calls = [];
    return new Error(
        "Flow.sequence.done: " + msg + ". Sequence:\n" +
        "ID:    " + sequence.id + "\n" +
        "First: " + sequence.first + "\n" +
        "Roles: " + JSON.stringify(sequence.roles, null, 4)
    );
}

function Sequence (scope, sequence_id, role, done) {

    const sequence = {
        id: sequence_id,
        fns: 1,
        seq: {},
        roles: {},
        calls: [done],

        done: () => {

            if (!sequence.first) {
                return done(seqErr("No first handler set on sequence", sequence));
            }

            if (!sequence.seq[sequence.first]) {
                return done(seqErr("First handler not in sequence.", sequence));
            }

            if (Object.keys(sequence.roles) < 1) {
                return done(seqErr("No roles on sequence.", sequence));
            }

            sequence.ready = true;
            sequence.calls.forEach((done) => {sequence.call(done)});
            delete sequence.calls;
        },

        fin: () => {
            sequence.parsed = true;
            if (--sequence.fns < 1) {
                sequence.done();
            }
        },

        call: (done) => {
            sequence.ready ? done(scope, null, sequence) : sequence.calls.push(done);
        } 
    };

    return sequence;
};
