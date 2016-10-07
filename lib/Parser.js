const Writable = require('stream').Writable;
const Module = require('./Module');
const Instance = require('./Instance');

function isBlankNode (string) {
    return string.indexOf('_:') === 0;
}

module.exports = (scope, event, args) => {
    return new Writable({
        objectMode: true,
        write: (triple, enc, done) => {

            let subject = triple[0] || triple.subject;
            let predicate = triple[1] || triple.predicate;
            let object = triple[2] || triple.object;

            switch (predicate) {

                case 'http://schema.jillix.net/vocab/onEnd':
                    event.set('e', object);
                    break;

                case 'http://schema.jillix.net/vocab/onError':
                    event.set('r', object);
                    break;

                case 'http://schema.jillix.net/vocab/module':
                    Module(scope, args, object, (error, module) => {

                        if (error) {
                            return event.error(error);
                        }

                        Instance(scope, args, subject, 'module', module);
                    });
                    break;

                case 'http://schema.jillix.net/vocab/roles':
                    Instance(scope, args, subject, (error, instance) => {

                        if (error) {
                            return event.error(error);
                        }

                        instance.role(object);
                    });
                    break;

                case 'http://schema.jillix.net/vocab/args':

                    try {
                        object = JSON.parse(object.slice(1, -1));
                    } catch (error) {
                        event.error(error);
                        break;
                    }

                    if (isBlankNode(subject)) {
                        event.handler(subject, 'args', object);
                        break;
                    }

                    Instance(scope, args, subject, (error, instance) => {

                        if (error) {
                            return event.error(error);
                        }

                        instance.args(object);
                    });
                    break;

                case 'http://schema.jillix.net/vocab/sequence':

                    if (isBlankNode(subject)) {
                        event.handler(subject, 'next', object);
                        break;
                    }

                    event.handler(object, 'first', true);
                    break;

                case 'http://schema.jillix.net/vocab/instance':
                    ++event.load;
                    Instance(scope, args, object, (error, instance) => {

                        if (error) {
                            return event.error(error);
                        }

                        event.handler(subject, 'instance', instance);
                        event.done(event);
                    });
                    break; 

                case 'http://schema.jillix.net/vocab/dataHandler':
                    event.handler(subject, 'data', object.split('#')[1]);
                    break;

                case 'http://schema.jillix.net/vocab/streamHandler':
                    event.handler(subject, 'stream', object.split('#')[1]);
                    break;

                case 'http://schema.jillix.net/vocab/emit':
                    ++event.load;
                    event.handler(subject, 'emit', object);
                    event.done(event);
                    break; 

                default:
                    console.log('[Parser] Unknown triple:', predicate);
            }

            done();
        }
    });
}; 
