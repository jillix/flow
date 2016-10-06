const Writable = require('stream').Writable;

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

            //console.log(subject, predicate, object);
            switch (predicate) {

                case 'http://schema.jillix.net/vocab/onEnd':
                    event.e = object;
                    break;

                case 'http://schema.jillix.net/vocab/onError':
                    event.r = object;
                    break;

                case 'http://schema.jillix.net/vocab/module':
                    event.module(subject, object);
                    break;

                case 'http://schema.jillix.net/vocab/roles':
                    event.instance(subject, 'role', object);
                    break;

                case 'http://schema.jillix.net/vocab/args':

                    if (isBlankNode(subject)) {
                        event.handler(subject, 'args', object);
                        break;
                    }

                    event.instance(subject, 'args', object);
                    break;

                case 'http://schema.jillix.net/vocab/sequence':

                    if (isBlankNode(subject)) {
                        event.handler(subject, 'next', object);
                        break;
                    }

                    event.handler(object, 'first', true);
                    break;

                case 'http://schema.jillix.net/vocab/instance':
                    event.handler(subject, 'instance', object);
                    break; 

                case 'http://schema.jillix.net/vocab/dataHandler':
                    event.handler(subject, 'data', object.split('#')[1]);
                    break;

                case 'http://schema.jillix.net/vocab/streamHandler':
                    event.handler(subject, 'stream', object.split('#')[1]);
                    break;

                case 'http://schema.jillix.net/vocab/emit':
                    event.handler(subject, 'emit', object);
                    break; 

                default:
                    console.log('[Parser] Unknown triple:', predicate);
            }

            done();
        }
    });
}; 
