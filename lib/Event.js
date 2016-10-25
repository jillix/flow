'use strict'

const libob = require('libobject');
const Parser = require('./Parser');

module.exports = (scope, event_iri, session = {role: '*'}, callback) => {

    let event = scope.cache.get(event_iri);
    if (event) {
        return event.ready(callback);
    }

    event = libob.queue((error, handler, done) => {

        if (error) {
            scope.cache.del(event.iri);
            return done(error);
        }

        let type, handler_iri;
        for (handler_iri in event.seq) {
            handler = event.seq[handler_iri];
            type = typeof handler.D === 'string' ? 'D' : (typeof handler.S === 'string' ? 'S' : null);
            type && getMethodRef(event, handler, type, handler.D || handler.S);
        }

        scope.cache.set(event_iri, {
            seq: event.seq,
            ready: fn => fn(null, seq)
        });
        done(null, event);

    }, callback);

    event.iri = event_iri;
    event.seq = {};
    event.set = (handler_iri, err, instance) => {
        console.log(handler_iri, err, instance);
        // TODO collect and check instances on handlers, call done if all instances are loaded
        event.get(handler_iri).I = instance;
        setTimeout(()=>event.done(err), 3000);
    };
    event.get = handler_iri => event.seq[handler_iri] = event.seq[handler_iri] || {};

    scope.cache.set(event_iri, event);

    scope.read(event_iri, session).on('error', event.done).
    pipe(Parser(scope, event, session)).on('error', event.done);
};

function getMethodRef (event, handler, type, method) {
    if (!(handler[type] = libob.path(method, handler.I))) {
        return event.done(new Error('Flow.event "' + event.iri + '": Method "' + method + '" on instance "' + handler.I._name + '" not found.'));
    }
}
