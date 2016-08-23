function getTypeFromId (string) {
    string = string.split('/').slice(3);

    if (string.length === 1) {
        return 'instance'; // 0
    }

    if (string[1] === 'listener') {
        if (string.length === 3) {
            return 'listener'; // 1
        }

        if (string.length === 4) {
            return 'handler'; // 2
        }

        if (string[4] === 'args') {
            return 'handler_args'; // 3
        }
    }

    if (string[1] === 'args') {
        return 'init_args'; // 4
    }

    if (string[0].indexOf('_:') === 0) {
        return 'blank_node'; // 5
    }
}

exports.getRule = (subject, predicate, object) => {

    // TODO
    // - how to find the type of a subject?
    //  > should be in the ID and ID is an IRI
    //  > read type from IRI (proto://domain:port/)
    // type = instance      | /[I]/
    // type = init args     | /[I]/args/
    // type = listener      | /[I]/on/[L]/
    // type = data handler  | /[I]/on/[L]/[Hp]/data/
    // type = stream handler| /[I]/on/[L]/[Hp]/stream/
    // type = event emit    | /[I]/on/[L]/[Hp]/emit/
    // type = handler args  | /[I]/on/[L]/[Hp]/args/
    // type = blank node    | _:[..]
    let subject_type = getTypeFromId(subject);
    if (!subject_type) {
        return new Error('Flow.rules: Invalid Subject type. ' + subject);
    }

    switch (predicate) {

// R_M0: P=module + S=instance
// A_M0: Load module and emit module ready on instance
        case 'http://schema.jillix.net/vocab/module':
            if (subject_type !== 'instance') {
                return 'ERROR';
            }
            return 'A_M0';

// R_I0: P=instance + S=dataHandler|streamHandler|eventEmit
// A_I0: Load instance (with module) emit ready event on sequence
        case 'http://schema.jillix.net/vocab/instance':
            //console.log('Load instance:', object);
            return 'A_I0';

// R_L0: P=listener + S=instance
// A_L0: Create sequence add to instance
        case 'http://schema.jillix.net/vocab/listener':
            //console.log('Listeners:', subject, object);
            return 'A_L0';

// R_H0: P=handler, S:listener
// A_H0: Add handler as first sequence
// R_H1: P=handler, S:handler
// A_H1: Add handler as next sequence
        case 'http://schema.jillix.net/vocab/dataHandler':
        case 'http://schema.jillix.net/vocab/steramHandler':
        case 'http://schema.jillix.net/vocab/eventEmit':
            //console.log('Handler:', subject, object);
            if (subject_type === 'listener') {
                return 'A_H0';
            }

            if (subject_type === 'handler') {
                return 'A_H1';
            }

            return 'ERROR';

// R_E0: P=emit + S=instance
// A_E0: Emit flow event scope.flow(event);
        case 'http://schema.jillix.net/vocab/eventEmit':
            return 'A_E0';

// R_F0: P=method + S=dataHandler|streamHandler
// A_F0: Get method reference add it to sequence
        case 'http://schema.jillix.net/vocab/method':
            return 'A_F0';

// R_A0: P=argument + S=instance
// A_A0: Build first level of arguments object on instance 
// R_A1: P=argument + S=handler
// A_A1: Build first level of arguments object on handler
        case 'http://schema.jillix.net/vocab/arguments':
            if (subject_type === 'instance') {
                return 'A_A0';
            }

            if (subject_type === 'handler') {
                return 'A_A1';
            }

            return 'ERROR';

// R_A2: P=[ANY] S=blank node
// A_A2: Add "object" to "subject", with property "predicate" 
// Build one level objects and create deep object on stream end
        default:
            //if (subject)
            return 'A_A2';
    }
};

