'use strict'

const Writable = require('stream').Writable;
const Module = require('./Module');
const Instance = require('./Instance');
const Event = require('./Event');
const Sequence = require('./Sequence');
const Args = require('./Args');

function isBlankNode (string) {
    return string.indexOf('_:') === 0;
}

module.exports = (scope, node, args) => {

    const loader = new Writable({
        objectMode: true,
        write: (triple, enc, done) => {

            let subject = triple[0] || triple.subject;
            let predicate = triple[1] || triple.predicate;
            let object = triple[2] || triple.object;
console.log(subject, predicate, object);
            switch (predicate) {
                case 'http://schema.jillix.net/vocab/module':
                    Instance(subject, args, scope).module(Module(object, args, scope));
                    break;

                case 'http://schema.jillix.net/vocab/event':
                    Instance(subject, args, scope);
                    Event(object, args, scope, node);
                    break;

                case 'http://schema.jillix.net/vocab/sequence':
                    (isBlankNode(subject) ? Sequence(subject, args, scope) : Event(subject, args, scope))
                    .link(Sequence(object, args, scope));
                    break;

                case 'http://schema.jillix.net/vocab/onEnd':
                    Event(subject, args, scope).onEnd(Event(object, args, scope));
                    break;

                case 'http://schema.jillix.net/vocab/onError':
                    Event(subject, args, scope).onError(Event(object, args, scope));
                    break;

                case 'http://schema.jillix.net/vocab/instance':
                    Sequence(subject, args, scope).instance(Instance(object, args, scope));
                    break; 

                case 'http://schema.jillix.net/vocab/dataHandler':
                    Sequence(subject, args, scope).data(object);
                    break;

                case 'http://schema.jillix.net/vocab/streamHandler':
                    Sequence(subject, args, scope).stream(object);
                    break;

                case 'http://schema.jillix.net/vocab/emit':
                    Sequence(subject, args, scope).emit(Event(object, args, scope));
                    break; 

                case 'http://schema.jillix.net/vocab/args':
                    (isBlankNode(subject) ? Sequence(subject, args, scope) : Instance(subject, args, scope))
                    .args(collector(object, subject, predicate));
                    break;

                default:
                    collector(object, subject, predicate);
            }

            done();
        }
    });

    const collector = Args(loader);

    loader.on('error', (error) => {
        console.error(error);
    }); 

    loader.on('finish', () => {
        console.log('Read finish.');
    });

    return loader;
};
