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

            let subject = triple[0] || triple.subject;
            let predicate = triple[1] || triple.predicate;
            let object = triple[2] || triple.object;

            switch (predicate) {
                case 'http://schema.jillix.net/vocab/Module':
                    Core.module(loader, subject, predicate, object);
                    break;

                case 'http://schema.jillix.net/vocab/ModuleInstanceConfig':
                    Core.instance(loader, subject, predicate, object);
                    break;

                case 'http://schema.jillix.net/vocab/FlowEvent':
                    Core.event(loader, subject, predicate, object);
                    break;

                case 'http://schema.jillix.net/vocab/Sequence':
                    Core.sequence(loader, subject, predicate, object);
                    break;

                case 'http://schema.jillix.net/vocab/DataHandler':
                    Core.dataHandler(loader, subject, predicate, object);
                    break;

                case 'http://schema.jillix.net/vocab/StreamHandler':
                    Core.streamHandler(loader, subject, predicate, object);
                    break;

                case 'http://schema.jillix.net/vocab/EventEmit':
                    Core.eventHandler(loader, subject, predicate, object);
                    break;

                default:
                    Core.object(loader, subject, predicate, object);
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
