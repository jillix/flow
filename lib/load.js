'use strict'

const EventEmitter = require('events');
const parse = require('./parse');

module.exports = (scope, node, instance, event, event_id, options) => {

    // handle cached event
    let parsed_event = scope.cache.get('l:' + event_id);
    if (parsed_event) { 
        return process.nextTick(node.link.bind(node, options, parsed_event));
    }

    // get cached instance or the name
    instance = scope.cache.get('i:' + instance) || instance;

    let loader = Loader(scope, node);
    let triples = scope.read(instance, event, options);

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

    loader.scope = scope;
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
