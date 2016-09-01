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

module.exports = (scope, node) => {

    let loader = new Writable({
        objectMode: true,
        write: (triple, enc, done) => {
            done(
                parse(
                    loader,
                    triple.subject,
                    triple.predicate,
                    triple.object
                )
            );
        }
    });

    loader.scope = scope;
    loader.check = {}; 
    loader.on('finish', () => {
        console.log('LOADER FINISH');
        //process.exit(1);
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
