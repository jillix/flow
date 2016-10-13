const Writable = require('stream').Writable;
const Module = require('./Module');
const Instance = require('./Instance');
const vocab = 'http://schema.jillix.net/vocab/';

function isBlankNode (string) {
    return string.indexOf('_:') === 0;
}

module.exports = (scope, event, session) => {
    const parser = new Writable({
        objectMode: true,
        write: (triple, enc, done) => {

            let subject = triple[0] || triple.subject;
            let predicate = triple[1] || triple.predicate;
            let object = triple[2] || triple.object;

            switch (predicate) {

                case vocab + 'onEnd':
                    event.e = object;
                    break;

                case vocab + 'onError':
                    event.r = object;
                    break;

                case vocab + 'module':
                    Module(scope, object, session, (error, module) => {

                        if (error) {
                            return event.done(error);
                        }

                        parser.done ? Instance(scope, subject).module(module) :
                        parser.on('finish', () => Instance(scope, subject).module(module));
                    });
                    break;

                case vocab + 'roles':
                    Instance(scope, subject).roles[object] = true;
                    break;

                case vocab + 'args':
                    object = object.slice(1, -1);

                    if (isBlankNode(subject)) {
                        event.set(subject, 'A', object);
                        break;
                    }

                    Instance(scope, subject).args = object;
                    break;

                case vocab + 'sequence':

                    if (isBlankNode(subject)) {
                        event.set(subject, 'N', object);
                        break;
                    }

                    event.set(object, 'F', true);
                    break;

                case vocab + 'instance':
                    ++event.load;
                    Instance(scope, object).done((error, instance) => {

                        if (error) {
                            return event.done(error);
                        }

                        event.set(subject, 'I', instance.clone);
                        event.done();
                    });
                    break; 

                case vocab + 'onceHandler':
                    event.set(subject, '1', object.split('#')[1]);
                    break;

                case vocab + 'dataHandler':
                    event.set(subject, 'D', object.split('#')[1]);
                    break;

                case vocab + 'streamHandler':
                    event.set(subject, 'S', object.split('#')[1]);
                    break;

                case vocab + 'emit':
                    ++event.load;
                    event.set(subject, 'E', object);
                    event.done();
                    break; 

                default:
                    event.done(new Error('[Parser] Unknown triple: ' + predicate));
            }

            done();
        }
    });
    parser.on('finish', () => parser.done = true);
    return parser;
}; 
