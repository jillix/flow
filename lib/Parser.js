"use strict"

const Writable = require("stream").Writable;
const Load = require("./Load");

function isBlankNode (string) {
    return string.indexOf('_:') === 0;
}

module.exports = (scope, sequence, session) => {

    const vocab = scope.env.vocab || "http://schema.jillix.net/vocab/";
    const parser = new Writable({
        objectMode: true,
        write: (triple, enc, done) => {

            let subject = triple[0] || triple.subject;
            let predicate = triple[1] || triple.predicate;
            let object = triple[2] || triple.object;

            switch (predicate) {

                case vocab + 'onEnd':
                    sequence.end = object;
                    break;

                case vocab + 'onError':
                    sequence.err = object;
                    break;

                case vocab + 'once':
                    sequence.once = subject;
                    break; 

                case vocab + 'roles':
                    sequence.roles[object] = true;
                    break; 

                case vocab + 'first':
                    sequence.get(subject).F = object;
                    break;

                case vocab + 'next':
                    sequence.get(subject).N = object;
                    break;

                case vocab + 'args':
                    sequence.get(subject).A = object;
                    break;

                case vocab + 'state':
                    sequence.get(subject).I =  object;
                    break;

                case vocab + 'data':
                case vocab + 'stream':
                    ++sequence.fns;
                    Load.Fn(scope, object, session, (err, fn) => sequence.fn(subject, err, fn, predicate === vocab + 'data' ? 'D' : 'S'));
                    break;

                case vocab + 'emit':
                    sequence.get(subject).E = object;
                    break; 

                default:
                    parser.emit('error', new Error('[Parser] Unknown triple: ' + predicate));
            }

            done();
        }
    });

    return parser;
}; 
