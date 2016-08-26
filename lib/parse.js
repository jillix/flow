const Core = require('./core');

function getTypeFromId (string) {

    // type = blank node    | _:[..]
    if (string.indexOf('_:') === 0) {
        return 'blank_node'; // 5
    }

    string = string.split('/').slice(3);

    // type = instance      | /[I]/
    if (string.length === 1) {
        return 'instance'; // 0
    }

    if (string[1] === 'listener') {

        // type = listener      | /[I]/on/[L]/
        if (string.length === 3) {
            return 'listener'; // 1
        }

        // type = handler args  | /[I]/on/[L]/[Hp]/args/
        if (string[4] === 'args') {
            return 'handler_args'; // 3
        }

        // type = data handler  | /[I]/on/[L]/[Hp]/data/
        // type = stream handler| /[I]/on/[L]/[Hp]/stream/
        // type = event emit    | /[I]/on/[L]/[Hp]/emit/
        if (string.length === 4) {
            return 'handler'; // 2
        }
    }

    // type = init args     | /[I]/args/
    if (string[1] === 'args') {
        return 'init_args'; // 4
    } 
}

module.exports = (loader, subject, predicate, object) => {

    let subject_type = getTypeFromId(subject);
    if (!subject_type) {
        return new Error('Flow.rules: Invalid Subject type. ' + subject);
    }

    switch (predicate) {

// R_M0: P=module + S=instance
// A_M0: Load module and emit module ready on instance
        case 'http://schema.jillix.net/vocab/module':
            if (subject_type !== 'instance') {
                return new Error('Flow.rules: Invalid module subject. ' + subject);
            }

            Core.module(loader, subject, predicate, object);
            return;

// R_I0: P=instance + S=dataHandler|streamHandler|eventEmit
// A_I0: Load instance (with module) emit ready event on sequence
        case 'http://schema.jillix.net/vocab/instance':
            Core.instance(loader, subject, predicate, object);
            return;

// R_L0: P=listener + S=instance
// A_L0: Create sequence add to instance
        case 'http://schema.jillix.net/vocab/listener':
            Core.listener(loader, subject, predicate, object);
            return;

// R_H0: P=handler, S:listener
// A_H0: Add handler as first sequence
// R_H1: P=handler, S:handler
// A_H1: Add handler as next sequence
        case 'http://schema.jillix.net/vocab/dataHandler':
        case 'http://schema.jillix.net/vocab/steramHandler':
        case 'http://schema.jillix.net/vocab/eventEmit':
            //console.log('Handler:', subject, object);
            if (subject_type === 'listener') {
                Core.sequence(loader, subject, predicate, object);
                return;
            }

            if (subject_type === 'handler') {
                Core.handler(loader, subject, predicate, object);
                return;
            }

            return new Error('Flow.rules: Invalid handler subject. ' + subject);

// R_E0: P=emit + S=instance
// A_E0: Emit flow event scope.flow(event);
        case 'http://schema.jillix.net/vocab/eventEmit':
            Core.event(loader, subject, predicate, object);
            return;

// R_F0: P=method + S=dataHandler|streamHandler
// A_F0: Get method reference add it to sequence
        case 'http://schema.jillix.net/vocab/method':
            Core.method(loader, subject, predicate, object);
            return;

// R_A0: P=argument + S=instance
// A_A0: Build first level of arguments object on instance 
// R_A1: P=argument + S=handler
// A_A1: Build first level of arguments object on handler
        case 'http://schema.jillix.net/vocab/arguments':
            if (subject_type === 'instance') {
                Core.object(loader, subject, predicate, object);
                return;
            }

            if (subject_type === 'handler') {
                Core.object(loader, subject, predicate, object);
                return;
            }

            return new Error('Flow.rules: Invalid arguments subject. ' + subject);

// R_A2: P=[ANY] S=blank node
// A_A2: Add "object" to "subject", with property "predicate" 
// Build one level objects and create deep object on stream end
        default:
            //if (subject)
            Core.object(loader, subject, predicate, object);
            return;
    }
};

