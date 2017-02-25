"use strict"

const Parser = require("./Parser");

module.exports = (scope, sequence_id,  event) => {

    // TODO error handling in async buffer
    return new Promise((resolve, reject) => {

        let sequence = scope.cache.get(sequence_id);
        if (sequence) {
            if (sequence.roles[event.role]) {
                sequence.call(event, resolve);
            } else {
                reject(new Error('Flow: Sorry, no access. Roles:' + Object.keys(sequence.roles) + ' Role:' + event.role));
            }
            return;
        }

        // create a sequence
        sequence = Sequence(sequence_id, event, resolve, reject);
        scope.cache.set(sequence_id, sequence);

        const parser = Parser(scope, sequence, event.role);
        const error = (err) => {};
        parser.on('finish', sequence.fin);
        parser.on('error', (err) => {
            scope.cache.del(sequence_id);
            reject(err);
        });

        setImmediate(() => {
            const triples = scope.seq(scope, sequence_id, event.role);
            triples.on('error', (err) => {
                scope.cache.del(sequence_id);
                reject(err);
            });
            triples.pipe(parser);
        });
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

function Sequence (sequence_id, event, resolve, reject) {

    const sequence = {
        id: sequence_id,
        fns: 1,
        seq: {},
        roles: {},
        calls: [[event, resolve]],

        done: () => {

            if (!sequence.first) {
                return reject(seqErr("No first handler set on sequence", sequence));
            }

            if (!sequence.seq[sequence.first]) {
                return reject(seqErr("First handler not in sequence.", sequence));
            }

            if (Object.keys(sequence.roles) < 1) {
                return reject(seqErr("No roles on sequence.", sequence));
            }

            // TODO reject all calls on error

            sequence.ready = true;
            sequence.calls.forEach((event) => {sequence.call(event[0], event[1])});
            delete sequence.calls;
        },

        fin: () => {
            sequence.parsed = true;
            if (--sequence.fns < 1) {
                sequence.done();
            }
        },

        call: (event, resolve) => {
            sequence.ready ? resolve([event, sequence]) : sequence.calls.push([event, resolve]);
        } 
    };

    return sequence;
};
