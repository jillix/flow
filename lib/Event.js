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
            scope.cache.del(event_iri);
            return done(error);
        }

        let type, handler_iri;
        for (handler_iri in event.seq) {
            handler = event.seq[handler_iri];
            type = typeof handler.D === 'string' ? 'D' : (typeof handler.S === 'string' ? 'S' : null);
            type && getMethodRef(event_iri, handler, type, handler.D || handler.S, done);
        }

        event = {
            seq: event.seq,
            end: event.end,
            err: event.err,
            ready: fn => process.nextTick(() => fn(null, event))
        };

        scope.cache.set(event_iri, event);

        done(null, event);

    }, callback);

    event._c = 0;
    event.seq = {};
    event.get = handler_iri => event.seq[handler_iri] = event.seq[handler_iri] || {};
    event.set = (handler_iri, err, instance) => {

        if (err) {
            return event.done(err);
        }

        if (!instance) {
            return ++event._c;
        }

        !err && (event.get(handler_iri).I = instance);
        --event._c === 0 && event._p && event.done();
    };

    event.fin = () => {
        event._p = true;
        event._c === 0 && event.done();
    };

    scope.cache.set(event_iri, event);

    process.nextTick(() => {
        scope.read(event_iri, session).on('error', event.done).
        pipe(Parser(scope, event, session)).on('error', event.done);
    });
};

function getMethodRef (event_iri, handler, type, method, done) {
    if (!(handler[type] = libob.path(method, handler.I))) {
        return done(new Error('Flow.event "' + event_iri + '": Method "' + method + '" on instance "' + handler.I._name + '" not found.'));
    }
}
