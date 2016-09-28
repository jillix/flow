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

            console.log(subject, predicate, object);
            switch (predicate) {
                case 'http://schema.jillix.net/vocab/module':
                    event.module(subject, object, args, scope);
                    break;

                case 'http://schema.jillix.net/vocab/sequence':

                    if (isBlankNode(subject)) {
                        event.link(subject, object);
                        break;
                    }

                    event.first(subject, object);
                    break;

                case 'http://schema.jillix.net/vocab/onEnd':
                    event.onEnd(object, args, scope);
                    break;

                case 'http://schema.jillix.net/vocab/onError':
                    event.onError(object, args, scope);
                    break;

                case 'http://schema.jillix.net/vocab/instance':
                    event.instance(subject, object, args, scope);
                    break; 

                case 'http://schema.jillix.net/vocab/roles':
                    event.role(subject, object);
                    break;

                case 'http://schema.jillix.net/vocab/dataHandler':
                    event.data(subject, object);
                    break;

                case 'http://schema.jillix.net/vocab/streamHandler':
                    event.stream(subject, object);
                    break;

                case 'http://schema.jillix.net/vocab/emit':
                    event.emit(subject, object);
                    break; 

                case 'http://schema.jillix.net/vocab/args':
                    event.args(object, subject);
                    break;

                default:
                    event.collect(object, subject, predicate);
            }

            done();
        }
    });
}; 
