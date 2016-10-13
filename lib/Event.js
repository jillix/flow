'use strict'

const libob = require('libobject');
const Parser = require('./Parser');

module.exports = (scope, event_iri, session = {role: '*'}, callback) => {

    let event = scope.cache.get(event_iri);
    if (event) {
        event.ready ? process.nextTick(() => callback(null, event)) : event.queue.push(callback);
        return;
    }

    event = {};
    event.queue = []; 
    event.load = 0;
    event.iri = event_iri;
    event.seq = {};
    event.set = (handler_iri, key, value) => Handler(scope, event, handler_iri, key, value);
    event.done = (error, finish) => Done(scope, event, error, finish);

    scope.cache.set(event_iri, event);
    event.queue.push(callback);

    process.nextTick(
        () => scope.read(event_iri, session)
        .on('error', error => callback(error))
        .pipe(Parser(scope, event, session))
        .on('error', error => event.done(error))
        .on('finish', () => event.done(null, true))
    );
};

function loaded (error, event) {
    event.queue.forEach(callback => callback(error, event));
    event.queue = [];
    event.load = 0;
}

function Done (scope, event, error, finish) {

    if (error) {
        scope.cache.del(event.iri);
    } else {
        finish ? (event._done = finish) : --event.load;
        event.ready = event.load === 0;
    }

    if (error || event.ready && event._done) {
        process.nextTick(() => loaded(error, event));
    }
}

function Handler (scope, event, iri, key, value) {

    let handler = event.seq[iri] = event.seq[iri] || {};

    if (key === '1') {
        handler.once = true;
        key = 'D';
    }

    handler[key] = value;

    if (handler.I) { 

        if (typeof handler.D === 'string') {
            getMethodRef(event, handler, 'D', handler.D);
        }

        if (typeof handler.S === 'string') {
            getMethodRef(event, handler, 'S', handler.S);
        }
    }
}

function getMethodRef (event, handler, type, method) {
    if (!(handler[type] = libob.path(method, handler.I))) {
        return event.done(new Error('Flow.parse: Method "' + method + '" on instance "' + handler.I._name + '" not found.'));
    }
}
