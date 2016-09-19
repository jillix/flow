module.exports = () => {

    return {
        link: () => {},
        build: () => {},
        data: () => {},
        stream: () => {},
        emit: () => {},
        args: () => {}
    };
};
/*
exports.sequence = (loader, subject, object) => {
    loader.emit('done', 'sequence', object);
    //console.log('sequence:     ', object);
    //console.log(subject[0] === '_' ? 'sequence:     ' : 'event:        ', subject);
};

exports.dataHandler = (loader, subject, object) => {
    loader.emit('done', 'DataHandler', object);
    //console.log('dataHandler:  ', object);
    //console.log('sequence:     ', subject);
    // check if seqence exists
    // 0 -> wait for sequence
    // 1 -> check if handler exists
    //      0 -> wait for handler
    //      1 -> check if instance exists
    //           0 -> wait and try again on instance ready
    //           1 -> get method ref and pass it to handler
    //console.log('get method ref', object, '\n');
};

exports.streamHandler = (loader, subject, object) => {
    loader.emit('done', 'StreamHandler', object);
    //console.log('streamHandler:', object);
    //console.log('sequence:     ', subject);
    //console.log('Create handler and add to seqence', object, '\n');
};

exports.eventHandler = (loader, subject, object) => {
    loader.emit('done', 'EventHandler', object);
    //console.log('eventHandler: ', object);
    //console.log('sequence:     ', subject);
    // check if sequence exists
    // 0 -> wait for sequence
    // 1 -> check if handler exists
    //      0 -> wait for handler
    //      1 -> emit flow event and pass it to handler
    //console.log('Get event stream and pipe to sequence', object, '\n');
};

// update sequences with method refs
function parseSequence (scope, event, sequences) {

    var getMethodRef = function (handler) {
        handler[0] = scope.instances[handler[0]].inst;

        if (!(handler[1] = libob.path(handler[1], handler[0]))) {
            return event.emit('error', new Error('Flow.parse: Method on instance "' + handler[0]._name + '" not found.'));
        }
    };

    for (var i = 0, l = sequences.length, sequence; i < l; ++i) {
        sequence = sequences[i];

        switch (sequence[0]) {
            case 0:
                sequence[1].forEach(getMethodRef);
                break;
            case 1:
                getMethodRef(sequence[1]);
                break;
            case 2:
                sequence[1][0] = scope.instances[sequence[1][0]].inst;
        }
    }

    event.s = sequences;
    event.ready = true;
    event.emit('ready', event);
}
*/
