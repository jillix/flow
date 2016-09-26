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

    return (event, args) => {
        return Flow(scope, event, args)
    };
};

function Flow (scope, event, args = {}) {

    // return if event name is missing
    if (!event) {
        throw new Error('Flow: Empty event.');
    }

    // return cached streams
    // TODO args for cached nodes??
    // TODO check if it's better, if the modules handles
    //      the reuse of streams?
    let node = scope.cache.get('s:' + event);
    if (node) {
        return node;
    }

    node = Node(scope, event, args);

    // handle cached event
    let parsed_event = scope.cache.get('l:' + event);
    if (parsed_event) { 
        process.nextTick(() => node.link(args, parsed_event));

    // pipe triple stream to loader
    } else {
        scope.read(event, args).pipe(Loader(scope, node, args));
    }

    // save stream in cache
    scope.cache.set('s:' + event, node);

    return node;
}
