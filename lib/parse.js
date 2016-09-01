const Core = require('./core');

function isInstance (string) {

    if (string.indexOf('_:') === 0) {
        return false;
    }

    return true;
}

module.exports = (loader, subject, predicate, object) => {

    let instance = isInstance(subject);

    switch (predicate) {
        // load the module
        case 'http://schema.jillix.net/vocab/module':
            if (!instance) {
                return new Error('Flow.rules: Invalid module subject. ' + subject);
            }

            Core.module(loader, subject, predicate, object);
            return;

        // load the instance
        case 'http://schema.jillix.net/vocab/instance':
            Core.instance(loader, subject, predicate, object);
            return;

        // parse the event
        case 'http://schema.jillix.net/vocab/event':
            if (!instance) {
                return new Error('Flow.rules: Invalid event subject.' + subject);
            }

            Core.event(loader, subject, predicate, object);
            return;            

        // create sequence
        case 'http://schema.jillix.net/vocab/sequence':
            Core.sequence(loader, subject, predicate, object);
            return;

        // get data handler method reference
        case 'http://schema.jillix.net/vocab/dataHandler':
            Core.dataHandler(loader, subject, predicate, object);
            return;

        // get stream handler method reference
        case 'http://schema.jillix.net/vocab/streamHandler':
            Core.streamHandler(loader, subject, predicate, object);
            return;

        // emit flow event and add stream to sequence, if S is a BN
        case 'http://schema.jillix.net/vocab/eventEmit':
            if (instance) {
                Core.emit(loader, subject, predicate, object);
                return;
            }

            Core.eventHandler(loader, subject, predicate, object);
            return;

        // create first level of the arguments object
        case 'http://schema.jillix.net/vocab/arguments':
            if (instance) {
                Core.object(loader, subject, predicate, object);
                return;
            }

            Core.object(loader, subject, predicate, object);
            return;

        // build the object in the blank node
        default:
            Core.object(loader, subject, predicate, object);
            return;
    }
};
