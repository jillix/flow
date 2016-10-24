'use strict'

const libob = require('libobject');
const Parser = require('./Parser');

module.exports = (scope, event_iri, session = {role: '*'}, callback) => {

    let event = scope.cache.get(event_iri);
    if (event) {
        event.ready ? process.nextTick(() => callback(null, event)) : event.add(callback);
        return;
    }

    event = libob.queue((error, handler, done) => {
console.log('Flow.load.event:', event_iri);
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

        //scope.cache.set(event_iri, event.seq);
        done(null, event);

    }, callback);

    event.iri = event_iri;
    event.seq = {};
    event.get = handler_iri => event.seq[handler_iri] = event.seq[handler_iri] || {};

    scope.cache.set(event_iri, event);

    process.nextTick(
        () => scope.read(event_iri, session)
        .on('error', event.done)
        .pipe(Parser(scope, event, session))
        .on('error', event.done)
        .on('finish', () => event.done(null, true))
    );
};

function getMethodRef (event, handler, type, method) {
    if (!(handler[type] = libob.path(method, handler.I))) {
        return event.done(new Error('Flow.event "' + event.iri + '": Method "' + method + '" on instance "' + handler.I._name + '" not found.'));
    }
}
