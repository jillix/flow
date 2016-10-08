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
                    event.e = object;
                    break;

                case 'http://schema.jillix.net/vocab/onError':
                    event.r = object;
                    break;

                case 'http://schema.jillix.net/vocab/module':
                    Module(scope, args, object, (error, module) => {

                        if (error) {
                            return event.done(error);
                        }

                        Instance(scope, args, subject).module(module);
                    });
                    break;

                case 'http://schema.jillix.net/vocab/roles':
                    Instance(scope, args, subject).roles[object] = true;
                    break;

                case 'http://schema.jillix.net/vocab/args':

                    try {
                        object = JSON.parse(object.slice(1, -1));
                    } catch (error) {
                        event.done(error);
                        break;
                    }

                    if (isBlankNode(subject)) {
                        event.set(subject, 'A', object);
                        break;
                    }

                    Instance(scope, args, subject).args = object;
                    break;

                case 'http://schema.jillix.net/vocab/sequence':

                    if (isBlankNode(subject)) {
                        event.set(subject, 'N', object);
                        break;
                    }

                    event.set(object, 'F', true);
                    break;

                case 'http://schema.jillix.net/vocab/instance':
                    ++event.load;
                    Instance(scope, args, object).done((error, instance) => {

                        if (error) {
                            return event.done(error);
                        }

                        event.set(subject, 'I', instance.clone);
                        event.done();
                    });
                    break; 

                case 'http://schema.jillix.net/vocab/dataHandler':
                    event.set(subject, 'D', object.split('#')[1]);
                    break;

                case 'http://schema.jillix.net/vocab/streamHandler':
                    event.set(subject, 'S', object.split('#')[1]);
                    break;

                case 'http://schema.jillix.net/vocab/emit':
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
}; 
