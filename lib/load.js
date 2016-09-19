'use strict'

const Writable = require('stream').Writable;
const Module = require('./Module');
const Instance = require('./Instance');
const Event = require('./Event');
const Sequence = require('./Sequence');
const Args = require('./Args');

/*
function roleAccess (item, role) {

    var roles = item && (item._roles || item.roles || {}) || {};
    role = role && role.role ? role.role : role;

    if (roles['*'] || (typeof role === 'string' && roles[role])) {
        return true;
    }
}
*/

function isBlankNode (string) {
    return string.indexOf('_:') === 0;
}

module.exports = (scope, node, args) => {

    let loader = new Writable({
        objectMode: true,
        write: (triple, enc, done) => {

            let subject = triple[0] || triple.subject;
            let predicate = triple[1] || triple.predicate;
            let object = triple[2] || triple.object;

            switch (predicate) {
                case 'http://schema.jillix.net/vocab/module':
                    Instance(loader, subject).build(Module(loader, object, subject));
                    break;

                case 'http://schema.jillix.net/vocab/event':
                    Instance(loader, subject).event(Event(loader, object, subject));
                    break;

                case 'http://schema.jillix.net/vocab/sequence':
                    (isBlankNode(subject) ? Sequence(loader, subject) : Event(loader, subject))
                    .link(Sequence(loader, object, subject));
                    break;

                case 'http://schema.jillix.net/vocab/onEnd':
                    Event(loader, subject).onEnd(Event(loader, object, subject));
                    break;

                case 'http://schema.jillix.net/vocab/onError':
                    Event(loader, subject).onError(Event(loader, object, subject));
                    break;

                case 'http://schema.jillix.net/vocab/instance':
                    Sequence(loader, subject).build(Instance(loader, object, subject));
                    break; 

                case 'http://schema.jillix.net/vocab/dataHandler':
                    Sequence(loader, subject).data(DataHandler(loader, object, subject));
                    break;

                case 'http://schema.jillix.net/vocab/streamHandler':
                    Sequence(loader, subject).stream(StreamHandler(loader, object, subject));
                    break;

                case 'http://schema.jillix.net/vocab/emit':
                    Sequence(loader, subject).emit(Event(loader, object, subject));
                    break; 

                case 'http://schema.jillix.net/vocab/args':
                    (isBlankNode(subject) ? Sequence(loader, subject) : Instance(loader, subject))
                    .args(Args(loader, object, subject, predicate));
                    break;

                default:
                    Args(loader, object, subject, predicate);
            }

            done();
        }
    });

    loader.args = args;
    loader.scope = scope;
    loader.index = {};

    loader.on('error', console.error.bind(console));
    loader.on('finish', () => {

        // check args index
        if (Object.keys(loader.index).length > 0) {
            // incomplete arguments
        }

        console.log('Finish! cache:', scope.cache.keys());
    });

    return loader;
};
