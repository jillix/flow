'use strict'

const Writable = require('stream').Writable;
const parse = require('./parse');

/*
scope.get = (key, emitter, cb) => {

    let item = scope.cache.get(key);
    let newItem;
    if (!item) {
        newItem = true;
        item = new EventEmitter();
        scope.cache.set(key, item);
        item.on('error', console.error.bind(console));
    }

    if (item.ready) {
        process.nextTick(cb.bind(emitter, item));
    } else {
        item.once('ready', cb.bind(emitter));
    }

    return !!newItem;
};
*/

module.exports = (scope, node, args) => {

    let loader = new Writable({
        objectMode: true,
        write: (triple, enc, done) => {
            done(
                parse(
                    loader,
                    triple.subject || triple[0],
                    triple.predicate || triple[1],
                    triple.object || triple[2]
                )
            );
        }
    });

    loader.args = args;
    loader.scope = scope;
    loader.check = {}; 
    loader.on('error', console.error.bind(console));
    loader.on('finish', () => {
        console.log('LOADER FINISH:', scope.cache.keys());
        //node.link();
    });

    loader.on('done', (what) => {
        switch (what) {
            case 'read':
                loader.check.read = true;
            break;
        }
    });

    return loader;
};
