'use strict'

const libob = require('libobject');
const Parser = require('./Parser');

module.exports = (scope, event_iri, args, callback) => {

    // ceck cached event
    let event = scope.cache.get(event_iri);
    if (event) {
        event.ready ? process.nextTick(() => callback(null, event)) : event.queue.push(callback);
        return;
    }

    // create new Event
    event = Event(scope, args, event_iri);
    scope.cache.set(event_iri, event);
    event.queue.push(callback);

    // stream triples into parser
    process.nextTick(() => {
        scope.read(event_iri, args).pipe(Parser(scope, event, args))
        .on('error', error => event.error(error))
        .on('finish', () => done(event, true));
    });
};

function Event (scope, args, iri) {

    const event = {};
    event.queue = []; 
    event.load = 0;
    event.iri = iri;
    event.handlers = {};
    event.handler = (iri, key, value) => Handler(scope, event, iri, key, value);
    event.set = (key, value) => event[key] = value;
    event.done = done;
    event.error = error => {
        scope.cache.del(iri);
        loaded(error, event);
    };
    return event;
}

function loaded (error, event) {
    event.queue.forEach(callback => callback(error, event));
    event.queue = [];
    event.load = 0;
}

function done (event, finish) {

    finish ? (event._done = finish) : --event.load;
    event.ready = event.load === 0;

    if (event.ready && event._done) {
        loaded(null, event);
    }
}

function Handler (scope, event, iri, key, value) {

    const handler = event.handlers[iri] = event.handlers[iri] || {};
    handler[key] = value;

    if (handler.instance) { 

        if (handler.data && typeof handler.data !== 'function') {
            getMethodRef(event, handler, 'data', handler.data);
        }

        if (handler.stream && typeof handler.stream !== 'function') {
            getMethodRef(event, handler, 'stream', handler.stream);
        }
    }
}

function getMethodRef (event, handler, type, method) {
    if (!(handler[type] = libob.path(method, handler.instance))) {
        return event.error(new Error('Flow.parse: Method "' + method + '" on instance "' + handler.instance._name + '" not found.'));
    }
}
