'use strict'

const EE = require('events');
const libob = require('libobject');
const Parser = require('./Parser');

module.exports = (scope, event_iri, args, callback) => {

    // ceck cached event
    let event = scope.cache.get(event_iri);
    if (event) {

        if (event.ready) { 
            return process.nextTick(() => callback(null, event));
        }

        // handle loading state
        return listen(scope, event_iri, event, callback);
    }

    // create new Event
    event = Event(scope, args);
    event.iri = event_iri;
    scope.cache.set(event_iri, event);
    listen(scope, event_iri, event, callback);

    // stream triples into parser
    process.nextTick(() => {
        scope.read(event_iri, args).pipe(Parser(scope, event, args))
        .on('error', error => event.emit('error', error)) 
        .on('finish', () => checkReady(event, true));
    });
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
        callback(error);
    });
}

function checkReady (event, finish) {

    if (finish) {
        event._done = true;
        event.ready = event.ready || event._load === 0;
    } else {
        event.ready = (--event._load === 0);
    }

    if (event.ready && event._done) {
        event.emit('ready', event);
    }
}

function Event (scope, args) {

    let event = new EE();
    event.setMaxListeners(0);
    event._load = 0;
    event.handlers = {};
    event.module = (iri, module) => Module(scope, event, args, iri, module);
    event.instance = (iri, key, value) => Instance(scope, event, iri, key, value);
    event.handler = (iri, key, value) => Handler(scope, event, iri, key, value);
    return event;
};

function Module (scope, event, args, iri, module_iri) {

    let module = scope.cache.get(module_iri);
    if (module) {
        return factory(scope, event, iri, module);
    }

    event.once(module_iri, module => factory(scope, event, iri, module));

    if (module === null) {
        return;
    }

    scope.cache.set(module_iri, null); 

    ++event._load;
    scope.mod(module_iri, args, (error, module) => {

        if (error) {
            scope.cache.del(module_iri);
            event.emit('error', error);
            // TODO stop everything and clean up (cache, refs)
            process.nextTick(() => event.removeAllListeners());
            return;
        }

        scope.cache.set(module_iri, module);
        event.emit(module_iri, module);
        checkReady(event); 
    });
}

function factory (scope, event, iri, module) { 

    if (!scope.cache.has(iri)) {

        const instance = Object.create(module); 
        instance.flow = scope.flow;
        instance._reset = scope.reset;
        instance._name = iri;

        let ready = (error) => {

            if (error) {
                return event.emit('error', error);
            }

            scope.cache.set(iri, instance);
            event.emit(iri, instance);
        };

        instance.init ? instance.init(instance.args || {}, ready) : ready();
    }
}

function Instance (scope, event, iri, key, value) {

    let instance = scope.cache.get(iri);
    if (!instance) {
        return event.on(iri, () => Instance(scope, event, iri, key, value));
    }

    if (key === 'role') {
        instance.roles = instance.roles || {};
        instance.roles[value] = true;
    }

    // TODO save arguments for instance init
    if (key === 'args') {
        instance.args = value;
    }
}

function Handler (scope, event, iri, key, value) {

    const handler = event.handlers[iri] = event.handlers[iri] || {};

    if (key === 'instance') {
        handler.instance = scope.cache.get(value);
    } else {
        handler[key] = value;
    }

    if (!handler.instance) {
        event.once(value, instance => {
            handler.instance = instance;
            checkHandlerMethod(event, handler);
        });
    } else {
        checkHandlerMethod(event, handler);
    }
}

function checkHandlerMethod (event, handler) {

    if (handler.data && typeof handler.data !== 'function') {
        getMethodRef(event, handler, 'data', handler.data);
    }

    if (handler.stream && typeof handler.stream !== 'function') {
        getMethodRef(event, handler, 'stream', handler.stream);
    }
}

function getMethodRef (event, handler, type, method) {
    if (!(handler[type] = libob.path(method, handler.instance))) {
        return event.emit('error', new Error('Flow.parse: Method "' + method + '" on instance "' + handler.instance._name + '" not found.'));
    }
}
