module.exports = () => {};

/*function isBlankNode (string) {
    return string.indexOf('_:') === 0;
}

function buildObject (data, subject, predicate, object) {
    if (data[subject]) {
        if (data[subject][predicate]) {
            if (!(data[subject][predicate] instanceof Array)) {
                data[subject][predicate] = [data[subject][predicate]];
            }
            data[subject][predicate].push(object);
        } else {
            data[subject][predicate] = object;
        }
    } else {
        data[subject] = {};
        data[subject][predicate] = object;
    }
}

exports.object = (loader, value, target, key) => {
    if (isBlankNode(target)) {
        // check index -> set value on target
        // set value in buffer
    }

    if (isBlankNode(value)) {}
   // console.log('Build object', object, 'of type', 'attach to', subject, '\n');
};
*/
