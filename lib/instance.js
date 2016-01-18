var isPublicPath = new RegExp("^\/[^/]");
var cbBuffer = {};
var instances = {};

// client side process.nextTick hack
// TODO creat PR to replace setTimout in nextTick for https://github.com/defunctzombie/node-process
/*if (typeof window !== 'undefined') {

    var queue = [];

    window.addEventListener('message', function (event) {
        var source = event.source;

        if ((source === window || source === null) && event.data === '_F_nT') {
            event.stopPropagation();
            if (queue.length > 0) {
                (queue.shift())();
            }
        }
    }, true);
}

exports.nextTick = function (fn) {

    var args = [].slice.apply(arguments);

    if (global.process) {
        return process.nextTick.apply(this, args);
    }

    // browser
    queue.push(function () {
        fn.apply(this, args.slice(1));
    });
    window.postMessage('_F_nT', '*');
};*/

// call callbacks
function callbacks (name, err, instance) {
    var cbs = cbBuffer[name];
    if (!cbs || !cbs.length) {
        return;
    }

    cbs.forEach(function (callback) {
        callback(err, instance);
    });
    if (err) {
        delete instances[name];
    }

    delete cbBuffer[name];
}

//reset caches
exports.reset = function () {
    instances = {};
    cbBuffer = {};
};

exports.instances = instances;

/**
 * Create a new module instance.
 *
 * @public
 * @param {object} The CommonJS module.
 * @param {object} The composition config.
 * @param {function} Callback handler.
 */
exports.factory = function (name, session,  callback) {

    if (!name) {
        return callback(new Error('Instance.factory: No name.'));
    }

    process.nextTick(_factory, this, name, session, callback);
};

function _factory (Flow, name, session, callback) {

    session = session || {};
    callback = callback || function (err) {err && console.error(err)};

    // check instance cache
    if (name !== '*' && instances[name]) {

        // buffer callback
        if (instances[name] === 1 || !instances[name]._ready) {
            return cbBuffer[name].push(callback);
        }

        if (!roleAccess(instances[name], session)) {
            return callback(console.log('E', new Error('Access denied for instance:' + name)));
        }

        return callback(null, instances[name]);
    }

    // save callback and mark instance as loading
    cbBuffer[name] = [callback];
    instances[name] = 1;

    // get composition
    Flow.mic(name, function (err, composition) {

        if (err) {
            return callbacks(name, err, null);
        }

        if (!composition || !composition.module) {
            return callbacks(name, new Error('Invalid composition'));
        }

        if (!roleAccess(composition, session)) {
            return callbacks(name, new Error('Access denied for instance:' + composition.name));
        }

        // pre load instances
        if (composition.load) {
            composition.load.forEach(function (instanceName) {
                Flow.load(instanceName);
            });
        }

        // get CommonJS module
        Flow.mod(composition.module, function (err, module) {

            if (err) {
                return callbacks(name, err);
            }

            build(Flow, module, composition, callback, (name === '*'));
        });
    });
};

/**
 * Check the role access for a cache item.
 *
 * @public
 * @param {object} The cached item.
 * @param {string} The role name.
 */
function roleAccess (item, role) {

    var roles = item && (item._roles || item.roles || {}) || {};
    role = role && role.role ? role.role : role;

    if (roles['*'] || (typeof role === 'string' && roles[role])) {
        return true;
    }
};

function build (Flow, module, config, callback, isEntrypoint) {

    // create new flow emitter
    var instance = Object.create(module);
    instance.flow = Flow.flow;
    instance._reset = Flow.reset;

    // extend instance
    instance._module = config.module;
    instance._config = config.config || {};
    instance._name = config.name;
    instance._roles = config.roles || {};
    instance._flow = config.flow || {};
    instance._events = {};

    var ready = function (err, data) {

        if (err) {
            return callbacks(isEntrypoint ? '*' : instance._name, err);
        }

        // mark instance as ready
        instance._ready = true;

        // save module instance in cache
        instances[instance._name] = instance;

        if (isEntrypoint) {
            instances['*'] = instance;
        }

        if (config.flow && config.flow.ready) {
            var event = instance.flow('ready');
            event.o.on('error', console.error);
            event.o.on('data', function nirvana () {});
            event.i.end(data || true);
        }

        callbacks(instance._name, null, instance);
    };

    // init loader instance
    instance.init ? instance.init(config.config || {}, ready) : ready();
}
