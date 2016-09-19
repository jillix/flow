'use strict'

const Node = require('./lib/node');
const Loader = require('./lib/load');

// factory
module.exports = (adapter) => {

    if (!adapter.read || !adapter.mod) {
        throw new Error('Flow: No Module or MIC adapter found.');
    }

    const scope = {
        env: adapter.env,
        mod: adapter.mod,
        read: adapter.read,

        // cache must have "get", "set" and "reset" methods
        cache: adapter.cache,

        // reset cache
        reset: () => {

            if (typeof adapter.reset === 'function') {
                adapter.reset();
            }

            adapter.cache.reset();
        }
    }; 

    return (instance, event, args) => {
        return Flow(scope, instance, event, args)
    };
};

function Flow (scope, instance, event, args) {

    // return if event name is missing
    if (!instance || !event) {
        throw new Error('Flow: Emit without instance or event name.');
    }

    let event_id = instance + event;

    // return cached streams
    // TODO args for cached nodes??
    let node = scope.cache.get('s:' + event_id);
    if (node) {
        return node;
    }

    node = Node(scope, event_id);
    args = args || {};

    // handle cached event
    let parsed_event = scope.cache.get('l:' + event_id);
    if (parsed_event) { 
        process.nextTick(() => node.link(args, parsed_event));
    } else {

        // get cached instance or the name
        instance = scope.cache.get('i:' + instance) || instance;

        // pipe triple stream to loader
        scope.read(instance, event, args).pipe(Loader(scope, node, args));
    }

    // save stream in cache
    scope.cache.set('s:' + event_id, node);

    return node;
}
