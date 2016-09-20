const EE = require('events');

module.exports = (loader) => {

    const data = {};
    const obs = new EE();
    loader.on('finish', () => {

        let rm = [];
        for (let key in data) {
            for (let sub in data[key]) {
                if (data[key][sub][0] === '_') {
                    if (!data[data[key][sub]]) {
                        //loader.emit('error', new Error('Flow.loader: Missing argument data (' + data[key][sub] + ').'));
                    } else {
                        rm.push(data[key][sub]);
                        data[key][sub] = data[data[key][sub]];
                    }
                }
            }
        }
        rm.forEach((key) => {
            delete data[key];
        });

        obs.emit('ready', data);
    });

    return (value, target, key) => {
        buildObject(data, target, key, value);
        return obs;
    }
};

function isBlankNode (string) {
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
