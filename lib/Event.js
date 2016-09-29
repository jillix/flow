'use strict'

const EE = require('events');
const libob = require('libobject');
const Parser = require('./Parser');
const Args = require('./Args');
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

function createInstance (scope, event, args, instance_iri, module) {

    let instance = Object.create(module);
    instance.flow = scope.flow;
    instance._name = instance_iri;
    instance._reset = scope.reset;

    if (instance.init) {
        instance.init(args, error => {

            if (error) {
                return event.emit('error', error);
            }

            scope.cache.set('i' + instance_iri, instance);
            event.emit(instance_iri, instance);
        });
    } else {
        scope.cache.set('i' + instance_iri, instance);
        event.emit(instance_iri, instance); 
    }
}

function Event (scope, name, args) {

    //new Promise()
    let event = new EE();
    event.setMaxListeners(0);
    event.load = 0;
    event.handlers = {};

    // instance
    event.module = (instance_iri, module_name) => {

        let module = scope.cache.get('m:' + module_name);
        if (module) {
            return createInstance(scope, event, args, instance_iri, module);
        }

        ++event.load;
        scope.mod(module_name, args, (error, module) => {

            if (error) {
                return event.emit('error', error);
            }

            createInstance(scope, event, args, instance_iri, module);

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
            createHandler(event, handler, {instance: instance});
        }

        event.once(instance_iri, (instance) => {
            createHandler(event, handler, {instance: instance});
        });
    };

    // event
    event.first = (handler) => {
        createHandler(event, handler, {first: true});
    };

    event.link = (handler, next) => {
        createHandler(event, handler, {next: next});
    };

    event.onEnd = (end_event) => {
        event.e = end_event;
    };

    event.onError = (error_event) => {
        event.r = error_event;
    }; 

    // handler
    event.data = (handler, method) => {
        createHandler(event, handler, {
            type: 0,
            method: method
        });
    };

    event.stream = (handler, method) => {
        createHandler(event, handler, {
            type: 1,
            method: method
        });
    };

    event.event = (handler, event_name) => {
        createHandler(event, handler, {
            type: 2,
            event: event_name
        });
    };

    event.args = (target, args) => {
        //console.log('Event.args:', target, args);
    };

    event.collect = (target, key, value) => {
        //console.log('Event.collect:', target, key, value);
    }

    return event;
};

function createHandler (event, handler, values) {
    handler = event.handlers[handler] = event.handlers[handler] || {}
    Object.assign(handler, values);

    if (handler.type < 2 && handler.instance && typeof handler.method !== 'function') {
        getMethodRef(event, handler); 
    }

    return handler;
}

function getMethodRef (event, handler) {
    if (!(handler.method = libob.path(handler.method, handler.instance))) {
        return event.emit('error', new Error('Flow.parse: Method on instance "' + handler.instance._name + '" not found.'));
    }
}
