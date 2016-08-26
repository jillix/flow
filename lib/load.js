'use strict'

const EventEmitter = require('events');
const parse = require('./parse');

module.exports = (scope, node, instance, event, event_id, options) => {

    // TODO define standard cache interface, like get, set and rm

    // handle cached event
    if (scope.events[event]) {
        return process.nextTick(node.link.bind(node, options));
    }

    let loader = Loader(scope, node);
    let triples = scope.read(scope.instances[instance] ? null : instance, event, options);

    // propagate error to the loader
    triples.on('error', loader.emit.bind(loader, 'error'));

    // parse triples
    triples.on('data', (triple) => { 

        let error = parse(loader, triple.subject, triple.predicate, triple.object);
        if (error) {
            read.emit('error', error);
            return;
        }
    });

    triples.on('end', () => {
        loader.emit('done', 'read');
        process.exit(1);
    });
};

// TODO load everything and resume event stream
function Loader (scope, node) {

    let loader = new EventEmitter();

    loader.check = {};

    loader.on('done', (what) => {
        switch (what) {
            case 'read':
                loader.check.read = true;
            break;
        }
    });

    return loader;
}
