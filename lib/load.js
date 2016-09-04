'use strict'

const Writable = require('stream').Writable;
const Core = require('./core');

/*
function isBlankNode (string) {
    return string.indexOf('_:') === 0;
}

function buildObject (data, subject, predicate, object) {
    if (data[subject]) {
        if (data[subject][predicate]) {
            if (!(data[subject][predicate] instanceof Array)) {
                data[subject][predicate] = [data[subject][predicate]];
            }
            data[subject][predicate].push(object);
        } else {
            data[subject][predicate] = object;
        }
    } else {
        data[subject] = {};
        data[subject][predicate] = object;
    }
}
*/

module.exports = (scope, node, args) => {

    let loader = new Writable({
        objectMode: true,
        write: (triple, enc, done) => {

            if (!(triple instanceof Array)) {
                triple = [
                    triple.subject,
                    triple.predicate,
                    triple.object
                ];
            } 

            let subject = triple[0];
            let predicate = triple[1];
            let object = triple[2];

            switch (predicate) {
                // load the module
                case 'http://schema.jillix.net/vocab/module':
                    Core.module(loader, subject, predicate, object);
                    return;

                // load the instance
                case 'http://schema.jillix.net/vocab/instance':
                    Core.instance(loader, subject, predicate, object);
                    return;

                // parse the event
                case 'http://schema.jillix.net/vocab/event':
                    Core.event(loader, subject, predicate, object);
                    return;            

                // create sequence
                case 'http://schema.jillix.net/vocab/sequence':
                    Core.sequence(loader, subject, predicate, object);
                    return;

                // get data handler method reference
                case 'http://schema.jillix.net/vocab/dataHandler':
                    Core.dataHandler(loader, subject, predicate, object);
                    return;

                // get stream handler method reference
                case 'http://schema.jillix.net/vocab/streamHandler':
                    Core.streamHandler(loader, subject, predicate, object);
                    return;

                // emit flow event and add stream to sequence, if S is a BN
                case 'http://schema.jillix.net/vocab/EventEmit':
                    Core.eventHandler(loader, subject, predicate, object);
                    return;

                // build the object in the blank node
                default:
                    Core.object(loader, subject, predicate, object);
                    return;
            }

            done();
        }
    });

    loader.buffer = {};
    loader.ids = {};
    loader.index = {};

    loader.args = args;
    loader.scope = scope;

    loader.on('error', console.error.bind(console));
    loader.on('finish', () => {
        //console.log('Cach keys:', scope.cache.keys());
        //console.log(loader.ids);
        //console.log(loader.buffer);
        //node.link();
    });

    loader.on('done', (what) => {
        //console.log('DONE:', what);
    });

    return loader;
};
