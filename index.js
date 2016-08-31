'use strict'

const EventEmitter = require('events');
const Node = require('./lib/node');
const Load = require('./lib/load');

module.exports = (adapter) => {

    if (!adapter.read || !adapter.mod) {
        throw new Error('Flow: No Module or MIC adapter found.');
    }

    let scope = {
        env: adapter.env,
        read: adapter.read,
        mod: adapter.mod,
        cache: adapter.cache
    };

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

    // reset cache
    scope.reset = () => {
        if (typeof adapter.reset === 'function') {
            adapter.reset.call(scope);
        }

        scope.cache.reset();
    };

    scope.flow = Flow.bind(null, scope);
    return scope.flow;
};

function Flow (scope, instance, event, args) {

    // return if event name is missing
    if (!instance || !event) {
        throw new Error('Flow: Emit without instance or event name.');
    }

    let event_id = instance + event;

    // return cached streams
    let stream = scope.cache.get('s:' + event_id);
    if (stream) {
        return stream;
    }

    stream = Node(scope, event_id);

    // load event and setup streams
    Load(scope, stream, instance, event, event_id, args || {});

    // save stream in cache
    scope.cache.set('s:' + event_id, stream);

    return stream;
}
