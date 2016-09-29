'use strict'

const EE = require('events');
const libob = require('libobject');
const Parser = require('./Parser');
const Args = require('./Args');
const Module = require('./Module');
const Instance = require('./Instance');
const cache_ns = 'e:';

module.exports = (scope, name, args, callback) => {

    // ceck cached event
    let cache_key = cache_ns + name;
    let event = scope.cache.get(cache_key);
    if (event) {

        if (event.ready) { 
            return process.nextTick(() => callback(null, event));
        }

        // handle loading state
        return listen(scope, cache_key, event, callback);
    }

    // create new Event
    event = Event(scope, name, args);
    scope.cache.set(cache_key, event);
    listen(scope, cache_key, event, callback);

    // stream triples into parser
    // TODO read in next tick
    scope.read(name, args)
    .pipe(Parser(scope, event, args))

    // TODO emit ready, when all modules are loaded
    .on('finish', () => {
        process.nextTick(() => {
            event.emit('ready', event);
        });
    });
};

function listen (cache, key, event, callback) {

    // successful loading
    event.once('ready', event => {
        event.removeAllListeners('error');
        callback(null, event);
    });

    // handle error
    event.once('error', error => {
        scope.cache.del(key);
        callback(error)
    });
}

function Event (scope, name, args) {

    //new Promise()
    let event = new EE();

    event.handlers = {};
    event.module = (instance, module) => {};
    event.role = (instance, role) => {
        // role 
    };

    event.setFirst = (event_name, handler) => {
        event.handlers[handler] = event.handlers[handler] || {};
        event.first = handler;
    };

    event.link = (handler, next) => {
        event.handlers[handler] = event.handlers[handler] || {};
        event.handlers[handler].next = next;
    };

    event.onEnd = (end_event) => {
        event.e = end_event;
    };

    event.onError = (error_event) => {
        event.r = error_event;
    };

    event.instance = (handler, instance) => {
        event.handlers[handler] = event.handlers[handler] || {};
        event.handlers[handler].instance = instance;
    };

    // TODO get method ref
    event.data = (handler, method) => {
        event.handlers[handler] = event.handlers[handler] || {};
        event.handlers[handler].type = 0;
        event.handlers[handler].method = method;
    };

    // TODO get method ref
    event.stream = (handler, method) => {
        event.handlers[handler] = event.handlers[handler] || {};
        event.handlers[handler].type = 1;
        event.handlers[handler].method = method;
    };

    event.event = (handler, event_name) => {
        event.handlers[handler] = event.handlers[handler] || {};
        event.handlers[handler].type = 2;
        event.handlers[handler].event = event_name;
    };

    event.args = (target, args) => {
        //console.log('Event.args:', target, args);
    };

    event.collect = (target, key, value) => {
        //console.log('Event.collect:', target, key, value);
    }

    return event;
};

/*
    var getMethodRef = function (handler) {
        handler[0] = scope.instances[handler[0]].inst;

        if (!(handler[1] = libob.path(handler[1], handler[0]))) {
            return event.emit('error', new Error('Flow.parse: Method on instance "' + handler[0]._name + '" not found.'));
        }
    };
}
*/
