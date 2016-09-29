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
    process.nextTick(() => scope.read(name, args).pipe(Parser(scope, event, args)));
};

function listen (scope, key, event, callback) {

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

    event.load = 0;
    event.handlers = {};

    // instance
    event.module = (instance_iri, module_name) => {

        let module = scope.cache.get('m:' + module_name);
        if (module) {

            instance = Object.create(module);
            instance.flow = scope.flow;
            instance._name = instance_iri;
            instance._reset = scope.reset;

            scope.cache.set('i' + instance_iri, instance);

            return event.emit(instance_iri, instance);
        }

        ++event.load;
        scope.mod(module_name, args, (error, module) => {

            if (error) {
                return event.emit('error', error);
            }

            let instance = Object.create(module);
            instance.flow = scope.flow;
            instance._name = instance_iri;
            instance._reset = scope.reset;

            scope.cache.set('i' + instance_iri, instance);
            event.emit(instance_iri, instance);

            // TODO check if parser has also finished
            if (--event.load === 0) {
                event.emit('ready', event);
            }
        });
    };

    event.role = (instance, role) => {
        // role 
    };

    event.instance = (handler, instance_iri) => {

        let instance = scope.cache.get('i:' + instance_iri);
        if (instance) {
            event.handlers[handler] = event.handlers[handler] || {};
            event.handlers[handler].instance = instance;
        }

        event.once(instance_iri, (instance) => {
            event.handlers[handler] = event.handlers[handler] || {};
            event.handlers[handler].instance = instance;

            if (event.handlers[handler].type < 2) {
                getMethodRef(event, event.handlers[handler]);
            }
        });
    };

    // event
    event.setFirst = (handler) => {
        event.handlers[handler] = event.handlers[handler] || {};
        event.handlers[handler].first = true;
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

    // handler
    event.data = (handler, method) => {
        event.handlers[handler] = event.handlers[handler] || {};
        event.handlers[handler].type = 0;
        event.handlers[handler].method = method;

        if (event.handlers[handler].instance) {
            getMethodRef(event, event.handlers[handler]);
        }
    };

    event.stream = (handler, method) => {
        event.handlers[handler] = event.handlers[handler] || {};
        event.handlers[handler].type = 1;
        event.handlers[handler].method = method;

        if (event.handlers[handler].instance) {
            getMethodRef(event, event.handlers[handler]);
        }
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

function getMethodRef (event, handler) {
    if (!(handler.method = libob.path(handler.method, handler.instance))) {
        return event.emit('error', new Error('Flow.parse: Method on instance "' + handler.instance._name + '" not found.'));
    }

}
