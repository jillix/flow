'use strict'

const EE = require('events');
const libob = require('libobject');
const Parser = require('./Parser');
const Link = require('./Link');
const Module = require('./Module');
const Instance = require('./Instance');
const Args = require('./Args');
const cache_ns = 'e:';

module.exports = (scope, name, args, stream) => {

    // ceck cached event
    let event = scope.cache.get(cache_ns + name);
    if (event) {

        if (event.ready) { 
            return process.nextTick(() => link(event, args, stream));
        }

        // handle loading state
        event.then(() => {});
        return;
    }

    // create new Event
    event = Event(scope, name, args);/*.then(() => {
        event.ready = true;
        scope.cache.set(cache_ns + name, event);
    }).catch(() => {
        scope.cache.del(cache_ns + name);
    });*/

    scope.cache.set(cache_ns + name, event);

    // stream triples into parser
    scope.read(name, args).pipe(Parser(scope, event, args));
};

function Event (scope, name, args) {

    //new Promise()
    let event = {};

    event.handlers = {};
    event.module = (instance, module) => {};
    event.role = (instance, role) => {};

    event.first = (event_name, handler) => {
        event.handlers[handler.id] = handler;
    };

    event.link = (previous, next) => {
        event.handlers[previous] = next;
    };

    event.onEnd = (end_event) => {
        event.e = event;
    };

    event.onError = (error_event) => {
        event.r = event;
    };

    event.handler = (event, sequence) => {
        //console.log('Sequence.handler:', sequence);
    };

    event.instance = (handler, instance) => {
        //console.log('Sequence.instance:', instance);
    };
    event.data = (handler, method) => {
        //console.log('Sequence.data:', method);
    };
    event.stream = (handler, method) => {
        //console.log('Sequence.stream:', method);
        //event.on('instance', (seq) => {
            // get method ref
            // seq.instance[method]
            
        //});
    };
    event.emit = (handler, emit) => {
        //console.log('Sequence.emit:', event);
    };
    event.args = (_event) => {
        //console.log('Sequence.args:', args[cache_key]);
    };

    //const collector = Args(event);
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
