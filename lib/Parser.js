"use strict"

const Writable = require("stream").Writable;
const Load = require("./Load");

function isBlankNode (string) {
    return string.indexOf('_:') === 0;
}

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
    seq.seq[handler] = seq.seq[handler] || {};
    seq.seq[handler][key] = value;
}

module.exports = (scope, sequence, session) => {

    const vocab = scope.env.vocab || "<http://schema.jillix.net/vocab/";
    const parser = new Writable({
        objectMode: true,
        write: (triple, enc, done) => {

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
                        parser.emit('error', err);
                        parser.end();
                        return;
                    }
                    break;

                case vocab + 'state>':
                    setHandler(sequence, subject ,'state', getState(scope, object));
                    break;

                case vocab + 'fn>':
                    ++sequence.fns;
                    Load.Fn(scope, object, session, (err, fn) => {

                        if (err) {
                            parser.emit('error', err);
                            parser.end();
                            return;
                        }

                        setHandler(sequence, subject, 'fn', fn);

                        if (--sequence.fns === 0 && sequence.parsed) {
                            delete sequence.fns;
                            sequence.done();
                        };
                    });
                    break;

                default:
                    parser.emit('error', new Error('[Parser] Unknown triple: ' + predicate));
            }

            done();
        }
    });

    return parser;
}; 
