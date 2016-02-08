"use strict";

exports.event = function (instance, event, session, callback) {

    var Flow = this;

    var config = instance._flow[event];
    var count = config.d ? (config.d.length || 0) : 0;
    var called = 0;
    var event_stream = {d:[/*S*/[/*H*/[/*H(o)*/]]]};
    var errorHappend;
    var check = function (err) {

        if (errorHappend) {
            return;
        }

        if (err) {
            errorHappend = true;
            return callback(err);
        };

        if (count === ++called) {
            callback(null, event_stream);
        }
    }

    // data sequence
    if (count > 0) {
        for (var i = 0, l = config.d.length; i < l; ++i) {
            resolveHandler(Flow, instance, session, event_stream.d, config.d[i], check);
        }
    }

    // end event
    if (config.e) {
        event_stream.e = config.e;
    }

    // error event
    if (config.r) {
        event_stream.r = config.r;
    }
};

function resolveHandler (Flow, instance, session, sections, handler, callback) {

    var path = handler;
    var args = {};

    if (handler.constructor === Array) {
        path = handler[0];
        args = handler[1] || {};
    }

    var type = path[0];
    path = path.substr(1);

    var section = sections[sections.length - 1];

    if (type === ':' || type === '.') {
        section[0].push(null);
        return getMethodRef(
            Flow,
            instance,
            session,
            {
                position: section[0].length - 1,
                target: section[0],
                path: path,
                args: args,
                once: (type === '.'),
            },
            callback
        );
    }
    
    if (type === '>' || type === '|') {

        var net = path[0];
        path = path.substr(1);

        section = [[], [type, path]];
        sections.push(section);

        if (net === '*') {
            return getMethodRef(
                Flow,
                instance,
                session,
                {
                    position: 1,
                    target: section[1][1],
                    path: path,
                    args: args
                },
                callback
            );
        }
        
        return callback();
    }

    callback(new Error('Flow.parse: Invalid handler type:', type));
}

function getMethodRef (Flow, instance, session, method, callback) {

    var instanceName = instance._name;
    var path = method.path; 

    if (path.indexOf('/') > 0) {
        path = path.split('/');
        instanceName = path[0];
        path = path[1];
    }

    Flow.load(instanceName, session, function (err, instance) {

        if (err) {
            return callback(err);
        }

        // get handler function
        var fn = getPathValue(path, [instance, global]);
        if (typeof fn !== 'function') {
            return callback(new Error('Flow.getEvent: Method "' + path + '" on instance "' + instance._name + '" not found.'));
        }
        
        method.target[method.position] = [fn, method.args, instance, method.once];
        callback();
    });
}

/**
 * Get a value from a property "path" (dot.notation).
 * path('Object.key.key.value'[, {'key': {'key': {'value': 123}}}]);
 *
 * @private
 * @param {string} The path in "dot" notation.
 * @param {array} The data objects, which are used to search the path.
 */
function getPathValue (path, scopes, count) {

    if (!path) {
        return;
    }

    // get scope
    count = count || 0;
    var scope = scopes[count];

    // if no scope is found
    if (!scope) {
        return;
    }

    // prepare path
    var o = path;
    path = path.split('.');

    // find keys in paths or return
    for (var i = 0; i < path.length; ++i) {
        if ((scope = scope[path[i]]) === undefined) {
            return scopes[++count] ? getPathValue(o, scopes, count) : undefined;
        }
    }

    return scope;
};
