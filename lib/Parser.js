const Writable = require('stream').Writable;
const Load = require('./Load');
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
                    Load.Module(scope, object, session, Load.Instance(scope, subject).done);
                    break;

                case vocab + 'roles':
                    Load.Instance(scope, subject).roles[object] = true;
                    break;

                case vocab + 'args':
                    object = object.slice(1, -1);

                    if (isBlankNode(subject)) {
                        event.get(subject).A = object;
                        break;
                    }

                    Load.Instance(scope, subject).args = object;
                    break;

                case vocab + 'sequence':

                    if (isBlankNode(subject)) {
                        event.get(subject).N = object;
                        break;
                    }

                    event.get(object).F = true;
                    break;

                case vocab + 'instance':
                    event.add();
                    Load.Instance(scope, object).push((err, instance) => {
                        event.get(subject).I = instance.clone;
                        parser.done ? event.done(err) : parser.on('finish', () => event.done(err));
                    });
                    break; 

                case vocab + 'onceHandler':
                    let seq = event.get(subject).D = object.split('#')[1];
                    seq.once = 1;
                    break;

                case vocab + 'dataHandler':
                    event.get(subject).D = object.split('#')[1];
                    break;

                case vocab + 'streamHandler':
                    event.set(subject).S = object.split('#')[1];
                    break;

                case vocab + 'emit':
                    event.get(subject).E = object;
                    break; 

                default:
                    parser.emit('error', new Error('[Parser] Unknown triple: ' + predicate));
            }

            done();
        }
    });

    parser.on('finish', () => {
        parser.done = true
        //event.done();
    });

    return parser;
}; 
