(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('http'), require('fs'), require('crypto')) :
    typeof define === 'function' && define.amd ? define(['http', 'fs', 'crypto'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Server = factory(global.http, global.fs, global.crypto));
}(this, (function (http, fs, crypto) { 'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var http__default = /*#__PURE__*/_interopDefaultLegacy(http);
    var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
    var crypto__default = /*#__PURE__*/_interopDefaultLegacy(crypto);

    class ServiceError extends Error {
        constructor(message = 'Service Error') {
            super(message);
            this.name = 'ServiceError'; 
        }
    }

    class NotFoundError extends ServiceError {
        constructor(message = 'Resource not found') {
            super(message);
            this.name = 'NotFoundError'; 
            this.status = 404;
        }
    }

    class RequestError extends ServiceError {
        constructor(message = 'Request error') {
            super(message);
            this.name = 'RequestError'; 
            this.status = 400;
        }
    }

    class ConflictError extends ServiceError {
        constructor(message = 'Resource conflict') {
            super(message);
            this.name = 'ConflictError'; 
            this.status = 409;
        }
    }

    class AuthorizationError extends ServiceError {
        constructor(message = 'Unauthorized') {
            super(message);
            this.name = 'AuthorizationError'; 
            this.status = 401;
        }
    }

    class CredentialError extends ServiceError {
        constructor(message = 'Forbidden') {
            super(message);
            this.name = 'CredentialError'; 
            this.status = 403;
        }
    }

    var errors = {
        ServiceError,
        NotFoundError,
        RequestError,
        ConflictError,
        AuthorizationError,
        CredentialError
    };

    const { ServiceError: ServiceError$1 } = errors;


    function createHandler(plugins, services) {
        return async function handler(req, res) {
            const method = req.method;
            console.info(`<< ${req.method} ${req.url}`);

            // Redirect fix for admin panel relative paths
            if (req.url.slice(-6) == '/admin') {
                res.writeHead(302, {
                    'Location': `http://${req.headers.host}/admin/`
                });
                return res.end();
            }

            let status = 200;
            let headers = {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            };
            let result = '';
            let context;

            // NOTE: the OPTIONS method results in undefined result and also it never processes plugins - keep this in mind
            if (method == 'OPTIONS') {
                Object.assign(headers, {
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Credentials': false,
                    'Access-Control-Max-Age': '86400',
                    'Access-Control-Allow-Headers': 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, X-Authorization, X-Admin, Access-Control-Allow-Origin, Vary'
                });
            } else {
                try {
                    context = processPlugins();
                    await handle(context);
                } catch (err) {
                    if (err instanceof ServiceError$1) {
                        status = err.status || 400;
                        result = composeErrorObject(err.code || status, err.message);
                    } else {
                        // Unhandled exception, this is due to an error in the service code - REST consumers should never have to encounter this;
                        // If it happens, it must be debugged in a future version of the server
                        console.error(err);
                        status = 500;
                        result = composeErrorObject(500, 'Server Error');
                    }
                }
            }

            res.writeHead(status, headers);
            if (context != undefined && context.util != undefined && context.util.throttle) {
                await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
            }
            res.end(result);

            function processPlugins() {
                const context = { params: {} };
                plugins.forEach(decorate => decorate(context, req));
                return context;
            }

            async function handle(context) {
                const { serviceName, tokens, query, body } = await parseRequest(req);
                if (serviceName == 'admin') {
                    return ({ headers, result } = services['admin'](method, tokens, query, body));
                } else if (serviceName == 'favicon.ico') {
                    return ({ headers, result } = services['favicon'](method, tokens, query, body));
                }

                const service = services[serviceName];

                if (service === undefined) {
                    status = 400;
                    result = composeErrorObject(400, `Service "${serviceName}" is not supported`);
                    console.error('Missing service ' + serviceName);
                } else {
                    result = await service(context, { method, tokens, query, body });
                }

                // NOTE: logout does not return a result
                // in this case the content type header should be omitted, to allow checks on the client
                if (result !== undefined) {
                    result = JSON.stringify(result);
                } else {
                    status = 204;
                    delete headers['Content-Type'];
                }
            }
        };
    }



    function composeErrorObject(code, message) {
        return JSON.stringify({
            code,
            message
        });
    }

    async function parseRequest(req) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const tokens = url.pathname.split('/').filter(x => x.length > 0);
        const serviceName = tokens.shift();
        const queryString = url.search.split('?')[1] || '';
        const query = queryString
            .split('&')
            .filter(s => s != '')
            .map(x => x.split('='))
            .reduce((p, [k, v]) => Object.assign(p, { [k]: decodeURIComponent(v) }), {});
        const body = await parseBody(req);

        return {
            serviceName,
            tokens,
            query,
            body
        };
    }

    function parseBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk) => body += chunk.toString());
            req.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (err) {
                    resolve(body);
                }
            });
        });
    }

    var requestHandler = createHandler;

    class Service {
        constructor() {
            this._actions = [];
            this.parseRequest = this.parseRequest.bind(this);
        }

        /**
         * Handle service request, after it has been processed by a request handler
         * @param {*} context Execution context, contains result of middleware processing
         * @param {{method: string, tokens: string[], query: *, body: *}} request Request parameters
         */
        async parseRequest(context, request) {
            for (let { method, name, handler } of this._actions) {
                if (method === request.method && matchAndAssignParams(context, request.tokens[0], name)) {
                    return await handler(context, request.tokens.slice(1), request.query, request.body);
                }
            }
        }

        /**
         * Register service action
         * @param {string} method HTTP method
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        registerAction(method, name, handler) {
            this._actions.push({ method, name, handler });
        }

        /**
         * Register GET action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        get(name, handler) {
            this.registerAction('GET', name, handler);
        }

        /**
         * Register POST action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        post(name, handler) {
            this.registerAction('POST', name, handler);
        }

        /**
         * Register PUT action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        put(name, handler) {
            this.registerAction('PUT', name, handler);
        }

        /**
         * Register PATCH action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        patch(name, handler) {
            this.registerAction('PATCH', name, handler);
        }

        /**
         * Register DELETE action
         * @param {string} name Action name. Can be a glob pattern.
         * @param {(context, tokens: string[], query: *, body: *)} handler Request handler
         */
        delete(name, handler) {
            this.registerAction('DELETE', name, handler);
        }
    }

    function matchAndAssignParams(context, name, pattern) {
        if (pattern == '*') {
            return true;
        } else if (pattern[0] == ':') {
            context.params[pattern.slice(1)] = name;
            return true;
        } else if (name == pattern) {
            return true;
        } else {
            return false;
        }
    }

    var Service_1 = Service;

    function uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    var util = {
        uuid
    };

    const uuid$1 = util.uuid;


    const data = fs__default['default'].existsSync('./data') ? fs__default['default'].readdirSync('./data').reduce((p, c) => {
        const content = JSON.parse(fs__default['default'].readFileSync('./data/' + c));
        const collection = c.slice(0, -5);
        p[collection] = {};
        for (let endpoint in content) {
            p[collection][endpoint] = content[endpoint];
        }
        return p;
    }, {}) : {};

    const actions = {
        get: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            let responseData = data;
            for (let token of tokens) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            return responseData;
        },
        post: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            // TODO handle collisions, replacement
            let responseData = data;
            for (let token of tokens) {
                if (responseData.hasOwnProperty(token) == false) {
                    responseData[token] = {};
                }
                responseData = responseData[token];
            }

            const newId = uuid$1();
            responseData[newId] = Object.assign({}, body, { _id: newId });
            return responseData[newId];
        },
        put: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            let responseData = data;
            for (let token of tokens.slice(0, -1)) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            if (responseData !== undefined && responseData[tokens.slice(-1)] !== undefined) {
                responseData[tokens.slice(-1)] = body;
            }
            return responseData[tokens.slice(-1)];
        },
        patch: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            console.log('Request body:\n', body);

            let responseData = data;
            for (let token of tokens) {
                if (responseData !== undefined) {
                    responseData = responseData[token];
                }
            }
            if (responseData !== undefined) {
                Object.assign(responseData, body);
            }
            return responseData;
        },
        delete: (context, tokens, query, body) => {
            tokens = [context.params.collection, ...tokens];
            let responseData = data;

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if (responseData.hasOwnProperty(token) == false) {
                    return null;
                }
                if (i == tokens.length - 1) {
                    const body = responseData[token];
                    delete responseData[token];
                    return body;
                } else {
                    responseData = responseData[token];
                }
            }
        }
    };

    const dataService = new Service_1();
    dataService.get(':collection', actions.get);
    dataService.post(':collection', actions.post);
    dataService.put(':collection', actions.put);
    dataService.patch(':collection', actions.patch);
    dataService.delete(':collection', actions.delete);


    var jsonstore = dataService.parseRequest;

    /*
     * This service requires storage and auth plugins
     */

    const { AuthorizationError: AuthorizationError$1 } = errors;



    const userService = new Service_1();

    userService.get('me', getSelf);
    userService.post('register', onRegister);
    userService.post('login', onLogin);
    userService.get('logout', onLogout);


    function getSelf(context, tokens, query, body) {
        if (context.user) {
            const result = Object.assign({}, context.user);
            delete result.hashedPassword;
            return result;
        } else {
            throw new AuthorizationError$1();
        }
    }

    function onRegister(context, tokens, query, body) {
        return context.auth.register(body);
    }

    function onLogin(context, tokens, query, body) {
        return context.auth.login(body);
    }

    function onLogout(context, tokens, query, body) {
        return context.auth.logout();
    }

    var users = userService.parseRequest;

    const { NotFoundError: NotFoundError$1, RequestError: RequestError$1 } = errors;


    var crud = {
        get,
        post,
        put,
        patch,
        delete: del
    };


    function validateRequest(context, tokens, query) {
        /*
        if (context.params.collection == undefined) {
            throw new RequestError('Please, specify collection name');
        }
        */
        if (tokens.length > 1) {
            throw new RequestError$1();
        }
    }

    function parseWhere(query) {
        const operators = {
            '<=': (prop, value) => record => record[prop] <= JSON.parse(value),
            '<': (prop, value) => record => record[prop] < JSON.parse(value),
            '>=': (prop, value) => record => record[prop] >= JSON.parse(value),
            '>': (prop, value) => record => record[prop] > JSON.parse(value),
            '=': (prop, value) => record => record[prop] == JSON.parse(value),
            ' like ': (prop, value) => record => record[prop].toLowerCase().includes(JSON.parse(value).toLowerCase()),
            ' in ': (prop, value) => record => JSON.parse(`[${/\((.+?)\)/.exec(value)[1]}]`).includes(record[prop]),
        };
        const pattern = new RegExp(`^(.+?)(${Object.keys(operators).join('|')})(.+?)$`, 'i');

        try {
            let clauses = [query.trim()];
            let check = (a, b) => b;
            let acc = true;
            if (query.match(/ and /gi)) {
                // inclusive
                clauses = query.split(/ and /gi);
                check = (a, b) => a && b;
                acc = true;
            } else if (query.match(/ or /gi)) {
                // optional
                clauses = query.split(/ or /gi);
                check = (a, b) => a || b;
                acc = false;
            }
            clauses = clauses.map(createChecker);

            return (record) => clauses
                .map(c => c(record))
                .reduce(check, acc);
        } catch (err) {
            throw new Error('Could not parse WHERE clause, check your syntax.');
        }

        function createChecker(clause) {
            let [match, prop, operator, value] = pattern.exec(clause);
            [prop, value] = [prop.trim(), value.trim()];

            return operators[operator.toLowerCase()](prop, value);
        }
    }


    function get(context, tokens, query, body) {
        validateRequest(context, tokens);

        let responseData;

        try {
            if (query.where) {
                responseData = context.storage.get(context.params.collection).filter(parseWhere(query.where));
            } else if (context.params.collection) {
                responseData = context.storage.get(context.params.collection, tokens[0]);
            } else {
                // Get list of collections
                return context.storage.get();
            }

            if (query.sortBy) {
                const props = query.sortBy
                    .split(',')
                    .filter(p => p != '')
                    .map(p => p.split(' ').filter(p => p != ''))
                    .map(([p, desc]) => ({ prop: p, desc: desc ? true : false }));

                // Sorting priority is from first to last, therefore we sort from last to first
                for (let i = props.length - 1; i >= 0; i--) {
                    let { prop, desc } = props[i];
                    responseData.sort(({ [prop]: propA }, { [prop]: propB }) => {
                        if (typeof propA == 'number' && typeof propB == 'number') {
                            return (propA - propB) * (desc ? -1 : 1);
                        } else {
                            return propA.localeCompare(propB) * (desc ? -1 : 1);
                        }
                    });
                }
            }

            if (query.offset) {
                responseData = responseData.slice(Number(query.offset) || 0);
            }
            const pageSize = Number(query.pageSize) || 10;
            if (query.pageSize) {
                responseData = responseData.slice(0, pageSize);
            }
    		
    		if (query.distinct) {
                const props = query.distinct.split(',').filter(p => p != '');
                responseData = Object.values(responseData.reduce((distinct, c) => {
                    const key = props.map(p => c[p]).join('::');
                    if (distinct.hasOwnProperty(key) == false) {
                        distinct[key] = c;
                    }
                    return distinct;
                }, {}));
            }

            if (query.count) {
                return responseData.length;
            }

            if (query.select) {
                const props = query.select.split(',').filter(p => p != '');
                responseData = Array.isArray(responseData) ? responseData.map(transform) : transform(responseData);

                function transform(r) {
                    const result = {};
                    props.forEach(p => result[p] = r[p]);
                    return result;
                }
            }

            if (query.load) {
                const props = query.load.split(',').filter(p => p != '');
                props.map(prop => {
                    const [propName, relationTokens] = prop.split('=');
                    const [idSource, collection] = relationTokens.split(':');
                    console.log(`Loading related records from "${collection}" into "${propName}", joined on "_id"="${idSource}"`);
                    const storageSource = collection == 'users' ? context.protectedStorage : context.storage;
                    responseData = Array.isArray(responseData) ? responseData.map(transform) : transform(responseData);

                    function transform(r) {
                        const seekId = r[idSource];
                        const related = storageSource.get(collection, seekId);
                        delete related.hashedPassword;
                        r[propName] = related;
                        return r;
                    }
                });
            }

        } catch (err) {
            console.error(err);
            if (err.message.includes('does not exist')) {
                throw new NotFoundError$1();
            } else {
                throw new RequestError$1(err.message);
            }
        }

        context.canAccess(responseData);

        return responseData;
    }

    function post(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length > 0) {
            throw new RequestError$1('Use PUT to update records');
        }
        context.canAccess(undefined, body);

        body._ownerId = context.user._id;
        let responseData;

        try {
            responseData = context.storage.add(context.params.collection, body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function put(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing, body);

        try {
            responseData = context.storage.set(context.params.collection, tokens[0], body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function patch(context, tokens, query, body) {
        console.log('Request body:\n', body);

        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing, body);

        try {
            responseData = context.storage.merge(context.params.collection, tokens[0], body);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    function del(context, tokens, query, body) {
        validateRequest(context, tokens);
        if (tokens.length != 1) {
            throw new RequestError$1('Missing entry ID');
        }

        let responseData;
        let existing;

        try {
            existing = context.storage.get(context.params.collection, tokens[0]);
        } catch (err) {
            throw new NotFoundError$1();
        }

        context.canAccess(existing);

        try {
            responseData = context.storage.delete(context.params.collection, tokens[0]);
        } catch (err) {
            throw new RequestError$1();
        }

        return responseData;
    }

    /*
     * This service requires storage and auth plugins
     */

    const dataService$1 = new Service_1();
    dataService$1.get(':collection', crud.get);
    dataService$1.post(':collection', crud.post);
    dataService$1.put(':collection', crud.put);
    dataService$1.patch(':collection', crud.patch);
    dataService$1.delete(':collection', crud.delete);

    var data$1 = dataService$1.parseRequest;

    const imgdata = 'iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAPNnpUWHRSYXcgcHJvZmlsZSB0eXBlIGV4aWYAAHja7ZpZdiS7DUT/uQovgSQ4LofjOd6Bl+8LZqpULbWm7vdnqyRVKQeCBAKBAFNm/eff2/yLr2hzMSHmkmpKlq9QQ/WND8VeX+38djac3+cr3af4+5fj5nHCc0h4l+vP8nJicdxzeN7Hxz1O43h8Gmi0+0T/9cT09/jlNuAeBs+XuMuAvQ2YeQ8k/jrhwj2Re3mplvy8hH3PKPr7SLl+jP6KkmL2OeErPnmbQ9q8Rmb0c2ynxafzO+eET7mC65JPjrM95exN2jmmlYLnophSTKLDZH+GGAwWM0cyt3C8nsHWWeG4Z/Tio7cHQiZ2M7JK8X6JE3t++2v5oj9O2nlvfApc50SkGQ5FDnm5B2PezJ8Bw1PUPvl6cYv5G788u8V82y/lPTgfn4CC+e2JN+Ds5T4ubzCVHu8M9JsTLr65QR5m/LPhvh6G/S8zcs75XzxZXn/2nmXvda2uhURs051x51bzMgwXdmIl57bEK/MT+ZzPq/IqJPEA+dMO23kNV50HH9sFN41rbrvlJu/DDeaoMci8ez+AjB4rkn31QxQxQV9u+yxVphRgM8CZSDDiH3Nxx2499oYrWJ6OS71jMCD5+ct8dcF3XptMNupie4XXXQH26nCmoZHT31xGQNy+4xaPg19ejy/zFFghgvG4ubDAZvs1RI/uFVtyACBcF3m/0sjlqVHzByUB25HJOCEENjmJLjkL2LNzQXwhQI2Ze7K0EwEXo59M0geRRGwKOMI292R3rvXRX8fhbuJDRkomNlUawQohgp8cChhqUWKIMZKxscQamyEBScaU0knM1E6WxUxO5pJrbkVKKLGkkksptbTqq1AjYiWLa6m1tobNFkyLjbsbV7TWfZceeuyp51567W0AnxFG1EweZdTRpp8yIayZZp5l1tmWI6fFrLDiSiuvsupqG6xt2WFHOCXvsutuj6jdUX33+kHU3B01fyKl1+VH1Diasw50hnDKM1FjRsR8cEQ8awQAtNeY2eJC8Bo5jZmtnqyInklGjc10thmXCGFYzsftHrF7jdy342bw9Vdx89+JnNHQ/QOR82bJm7j9JmqnGo8TsSsL1adWyD7Or9J8aTjbXx/+9v3/A/1vDUS9tHOXtLaM6JoBquRHJFHdaNU5oF9rKVSjYNewoFNsW032cqqCCx/yljA2cOy7+7zJ0biaicv1TcrWXSDXVT3SpkldUqqPIJj8p9oeWVs4upKL3ZHgpNzYnTRv5EeTYXpahYRgfC+L/FyxBphCmPLK3W1Zu1QZljTMJe5AIqmOyl0qlaFCCJbaPAIMWXzurWAMXiB1fGDtc+ld0ZU12k5cQq4v7+AB2x3qLlQ3hyU/uWdzzgUTKfXSputZRtp97hZ3z4EE36WE7WtjbqMtMr912oRp47HloZDlywxJ+uyzmrW91OivysrM1Mt1rZbrrmXm2jZrYWVuF9xZVB22jM4ccdaE0kh5jIrnzBy5w6U92yZzS1wrEao2ZPnE0tL0eRIpW1dOWuZ1WlLTqm7IdCESsV5RxjQ1/KWC/y/fPxoINmQZI8Cli9oOU+MJYgrv006VQbRGC2Ug8TYzrdtUHNjnfVc6/oN8r7tywa81XHdZN1QBUhfgzRLzmPCxu1G4sjlRvmF4R/mCYdUoF2BYNMq4AjD2GkMGhEt7PAJfKrH1kHmj8eukyLb1oCGW/WdAtx0cURYqtcGnNlAqods6UnaRpY3LY8GFbPeSrjKmsvhKnWTtdYKhRW3TImUqObdpGZgv3ltrdPwwtD+l1FD/htxAwjdUzhtIkWNVy+wBUmDtphwgVemd8jV1miFXWTpumqiqvnNuArCrFMbLPexJYpABbamrLiztZEIeYPasgVbnz9/NZxe4p/B+FV3zGt79B9S0Jc0Lu+YH4FXsAsa2YnRIAb2thQmGc17WdNd9cx4+y4P89EiVRKB+CvRkiPTwM7Ts+aZ5aV0C4zGoqyOGJv3yGMJaHXajKbOGkm40Ychlkw6c6hZ4s+SDJpsmncwmm8ChEmBWspX8MkFB+kzF1ZlgoGWiwzY6w4AIPDOcJxV3rtUnabEgoNBB4MbNm8GlluVIpsboaKl0YR8kGnXZH3JQZrH2MDxxRrHFUduh+CvQszakraM9XNo7rEVjt8VpbSOnSyD5dwLfVI4+Sl+DCZc5zU6zhrXnRhZqUowkruyZupZEm/dA2uVTroDg1nfdJMBua9yCJ8QPtGw2rkzlYLik5SBzUGSoOqBMJvwTe92eGgOVx8/T39TP0r/PYgfkP1IEyGVhYHXyJiVPU0skB3dGqle6OZuwj/Hw5c2gV5nEM6TYaAryq3CRXsj1088XNwt0qcliqNc6bfW+TttRydKpeJOUWTmmUiwJKzpr6hkVzzLrVs+s66xEiCwOzfg5IRgwQgFgrriRlg6WQS/nGyRUNDjulWsUbO8qu/lWaWeFe8QTs0puzrxXH1H0b91KgDm2dkdrpkpx8Ks2zZu4K1GHPpDxPdCL0RH0SZZrGX8hRKTA+oUPzQ+I0K1C16ZSK6TR28HUdlnfpzMsIvd4TR7iuSe/+pn8vief46IQULRGcHvRVUyn9aYeoHbGhEbct+vEuzIxhxJrgk1oyo3AFA7eSSSNI/Vxl0eLMCrJ/j1QH0ybj0C9VCn9BtXbz6Kd10b8QKtpTnecbnKHWZxcK2OiKCuViBHqrzM2T1uFlGJlMKFKRF1Zy6wMqQYtgKYc4PFoGv2dX2ixqGaoFDhjzRmp4fsygFZr3t0GmBqeqbcBFpvsMVCNajVWcLRaPBhRKc4RCCUGZphKJdisKdRjDKdaNbZfwM5BulzzCvyv0AsAlu8HOAdIXAuMAg0mWa0+0vgrODoHlm7Y7rXUHmm9r2RTLpXwOfOaT6iZdASpqOIXfiABLwQkrSPFXQgAMHjYyEVrOBESVgS4g4AxcXyiPwBiCF6g2XTPk0hqn4D67rbQVFv0Lam6Vfmvq90B3WgV+peoNRb702/tesrImcBCvIEaGoI/8YpKa1XmDNr1aGUwjDETBa3VkOLYVLGKeWQcd+WaUlsMdTdUg3TcUPvdT20ftDW4+injyAarDRVVRgc906sNTo1cu7LkDGewjkQ35Z7l4Htnx9MCkbenKiNMsif+5BNVnA6op3gZVZtjIAacNia+00w1ZutIibTMOJ7IISctvEQGDxEYDUSxUiH4R4kkH86dMywCqVJ2XpzkUYUgW3mDPmz0HLW6w9daRn7abZmo4QR5i/A21r4oEvCC31oajm5CR1yBZcIfN7rmgxM9qZBhXh3C6NR9dCS1PTMJ30c4fEcwkq0IXdphpB9eg4x1zycsof4t6C4jyS68eW7OonpSEYCzb5dWjQH3H5fWq2SH41O4LahPrSJA77KqpJYwH6pdxDfDIgxLR9GptCKMoiHETrJ0wFSR3Sk7yI97KdBVSHXeS5FBnYKIz1JU6VhdCkfHIP42o0V6aqgg00JtZfdK6hPeojtXvgfnE/VX0p0+fqxp2/nDfvBuHgeo7ppkrr/MyU1dT73n5B/qi76+lzMnVnHRJDeZOyj3XXdQrrtOUPQunDqgDlz+iuS3QDafITkJd050L0Hi2kiRBX52pIVso0ZpW1YQsT2VRgtxm9iiqU2qXyZ0OdvZy0J1gFotZFEuGrnt3iiiXvECX+UcWBqpPlgLRkdN7cpl8PxDjWseAu1bPdCjBSrQeVD2RHE7bRhMb1Qd3VHVXVNBewZ3Wm7avbifhB+4LNQrmp0WxiCNkm7dd7mV39SnokrvfzIr+oDSFq1D76MZchw6Vl4Z67CL01I6ZiX/VEqfM1azjaSkKqC+kx67tqTg5ntLii5b96TAA3wMTx2NvqsyyUajYQHJ1qkpmzHQITXDUZRGTYtNw9uLSndMmI9tfMdEeRgwWHB7NlosyivZPlvT5KIOc+GefU9UhA4MmKFXmhAuJRFVWHRJySbREImpQysz4g3uJckihD7P84nWtLo7oR4tr8IKdSBXYvYaZnm3ffhh9nyWPDa+zQfzdULsFlr/khrMb7hhAroOKSZgxbUzqdiVIhQc+iZaTbpesLXSbIfbjwXTf8AjbnV6kTpD4ZsMdXMK45G1NRiMdh/bLb6oXX+4rWHen9BW+xJDV1N+i6HTlKdLDMnVkx8tdHryus3VlCOXXKlDIiuOkimXnmzmrtbGqmAHL1TVXU73PX5nx3xhSO3QKtBqbd31iQHHBNXXrYIXHVyQqDGIcc6qHEcz2ieN+radKS9br/cGzC0G7g0YFQPGdqs7MI6pOt2BgYtt/4MNW8NJ3VT5es/izZZFd9yIfwY1lUubGSSnPiWWzDpAN+sExNptEoBx74q8bAzdFu6NocvC2RgK2WR7doZodiZ6OgoUrBoWIBM2xtMHXUX3GGktr5RtwPZ9tTWfleFP3iEc2hTar6IC1Y55ktYKQtXTsKkfgQ+al0aXBCh2dlCxdBtLtc8QJ4WUKIX+jlRR/TN9pXpNA1bUC7LaYUzJvxr6rh2Q7ellILBd0PcFF5F6uArA6ODZdjQYosZpf7lbu5kNFfbGUUY5C2p7esLhhjw94Miqk+8tDPgTVXX23iliu782KzsaVdexRSq4NORtmY3erV/NFsJU9S7naPXmPGLYvuy5USQA2pcb4z/fYafpPj0t5HEeD1y7W/Z+PHA2t8L1eGCCeFS/Ph04Hafu+Uf8ly2tjUNDQnNUIOqVLrBLIwxK67p3fP7LaX/LjnlniCYv6jNK0ce5YrPud1Gc6LQWg+sumIt2hCCVG3e8e5tsLAL2qWekqp1nKPKqKIJcmxO3oljxVa1TXVDVWmxQ/lhHHnYNP9UDrtFdwekRKCueDRSRAYoo0nEssbG3znTTDahVUXyDj+afeEhn3w/UyY0fSv5b8ZuSmaDVrURYmBrf0ZgIMOGuGFNG3FH45iA7VFzUnj/odcwHzY72OnQEhByP3PtKWxh/Q+/hkl9x5lEic5ojDGgEzcSpnJEwY2y6ZN0RiyMBhZQ35AigLvK/dt9fn9ZJXaHUpf9Y4IxtBSkanMxxP6xb/pC/I1D1icMLDcmjZlj9L61LoIyLxKGRjUcUtOiFju4YqimZ3K0odbd1Usaa7gPp/77IJRuOmxAmqhrWXAPOftoY0P/BsgifTmC2ChOlRSbIMBjjm3bQIeahGwQamM9wHqy19zaTCZr/AtjdNfWMu8SZAAAA13pUWHRSYXcgcHJvZmlsZSB0eXBlIGlwdGMAAHjaPU9LjkMhDNtzijlCyMd5HKflgdRdF72/xmFGJSIEx9ihvd6f2X5qdWizy9WH3+KM7xrRp2iw6hLARIfnSKsqoRKGSEXA0YuZVxOx+QcnMMBKJR2bMdNUDraxWJ2ciQuDDPKgNDA8kakNOwMLriTRO2Alk3okJsUiidC9Ex9HbNUMWJz28uQIzhhNxQduKhdkujHiSJVTCt133eqpJX/6MDXh7nrXydzNq9tssr14NXuwFXaoh/CPiLRfLvxMyj3GtTgAAAGFaUNDUElDQyBwcm9maWxlAAB4nH2RPUjDQBzFX1NFKfUD7CDikKE6WRAVESepYhEslLZCqw4ml35Bk4YkxcVRcC04+LFYdXBx1tXBVRAEP0Dc3JwUXaTE/yWFFjEeHPfj3b3H3TtAqJeZanaMA6pmGclYVMxkV8WuVwjoRQCz6JeYqcdTi2l4jq97+Ph6F+FZ3uf+HD1KzmSATySeY7phEW8QT29aOud94hArSgrxOfGYQRckfuS67PIb54LDAs8MGenkPHGIWCy0sdzGrGioxFPEYUXVKF/IuKxw3uKslquseU/+wmBOW0lxneYwYlhCHAmIkFFFCWVYiNCqkWIiSftRD/+Q40+QSyZXCYwcC6hAheT4wf/gd7dmfnLCTQpGgc4X2/4YAbp2gUbNtr+PbbtxAvifgSut5a/UgZlP0mstLXwE9G0DF9ctTd4DLneAwSddMiRH8tMU8nng/Yy+KQsM3AKBNbe35j5OH4A0dbV8AxwcAqMFyl73eHd3e2//nmn29wOGi3Kv+RixSgAAEkxpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDQuNC4wLUV4aXYyIj4KIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgIHhtbG5zOmlwdGNFeHQ9Imh0dHA6Ly9pcHRjLm9yZy9zdGQvSXB0YzR4bXBFeHQvMjAwOC0wMi0yOS8iCiAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiCiAgICB4bWxuczpwbHVzPSJodHRwOi8vbnMudXNlcGx1cy5vcmcvbGRmL3htcC8xLjAvIgogICAgeG1sbnM6R0lNUD0iaHR0cDovL3d3dy5naW1wLm9yZy94bXAvIgogICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICAgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICAgeG1sbnM6eG1wUmlnaHRzPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvcmlnaHRzLyIKICAgeG1wTU06RG9jdW1lbnRJRD0iZ2ltcDpkb2NpZDpnaW1wOjdjZDM3NWM3LTcwNmItNDlkMy1hOWRkLWNmM2Q3MmMwY2I4ZCIKICAgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2NGY2YTJlYy04ZjA5LTRkZTMtOTY3ZC05MTUyY2U5NjYxNTAiCiAgIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoxMmE1NzI5Mi1kNmJkLTRlYjQtOGUxNi1hODEzYjMwZjU0NWYiCiAgIEdJTVA6QVBJPSIyLjAiCiAgIEdJTVA6UGxhdGZvcm09IldpbmRvd3MiCiAgIEdJTVA6VGltZVN0YW1wPSIxNjEzMzAwNzI5NTMwNjQzIgogICBHSU1QOlZlcnNpb249IjIuMTAuMTIiCiAgIGRjOkZvcm1hdD0iaW1hZ2UvcG5nIgogICBwaG90b3Nob3A6Q3JlZGl0PSJHZXR0eSBJbWFnZXMvaVN0b2NrcGhvdG8iCiAgIHhtcDpDcmVhdG9yVG9vbD0iR0lNUCAyLjEwIgogICB4bXBSaWdodHM6V2ViU3RhdGVtZW50PSJodHRwczovL3d3dy5pc3RvY2twaG90by5jb20vbGVnYWwvbGljZW5zZS1hZ3JlZW1lbnQ/dXRtX21lZGl1bT1vcmdhbmljJmFtcDt1dG1fc291cmNlPWdvb2dsZSZhbXA7dXRtX2NhbXBhaWduPWlwdGN1cmwiPgogICA8aXB0Y0V4dDpMb2NhdGlvbkNyZWF0ZWQ+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpMb2NhdGlvbkNyZWF0ZWQ+CiAgIDxpcHRjRXh0OkxvY2F0aW9uU2hvd24+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpMb2NhdGlvblNob3duPgogICA8aXB0Y0V4dDpBcnR3b3JrT3JPYmplY3Q+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpBcnR3b3JrT3JPYmplY3Q+CiAgIDxpcHRjRXh0OlJlZ2lzdHJ5SWQ+CiAgICA8cmRmOkJhZy8+CiAgIDwvaXB0Y0V4dDpSZWdpc3RyeUlkPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJzYXZlZCIKICAgICAgc3RFdnQ6Y2hhbmdlZD0iLyIKICAgICAgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjOTQ2M2MxMC05OWE4LTQ1NDQtYmRlOS1mNzY0ZjdhODJlZDkiCiAgICAgIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkdpbXAgMi4xMCAoV2luZG93cykiCiAgICAgIHN0RXZ0OndoZW49IjIwMjEtMDItMTRUMTM6MDU6MjkiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogICA8cGx1czpJbWFnZVN1cHBsaWVyPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6SW1hZ2VTdXBwbGllcj4KICAgPHBsdXM6SW1hZ2VDcmVhdG9yPgogICAgPHJkZjpTZXEvPgogICA8L3BsdXM6SW1hZ2VDcmVhdG9yPgogICA8cGx1czpDb3B5cmlnaHRPd25lcj4KICAgIDxyZGY6U2VxLz4KICAgPC9wbHVzOkNvcHlyaWdodE93bmVyPgogICA8cGx1czpMaWNlbnNvcj4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgcGx1czpMaWNlbnNvclVSTD0iaHR0cHM6Ly93d3cuaXN0b2NrcGhvdG8uY29tL3Bob3RvL2xpY2Vuc2UtZ20xMTUwMzQ1MzQxLT91dG1fbWVkaXVtPW9yZ2FuaWMmYW1wO3V0bV9zb3VyY2U9Z29vZ2xlJmFtcDt1dG1fY2FtcGFpZ249aXB0Y3VybCIvPgogICAgPC9yZGY6U2VxPgogICA8L3BsdXM6TGljZW5zb3I+CiAgIDxkYzpjcmVhdG9yPgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaT5WbGFkeXNsYXYgU2VyZWRhPC9yZGY6bGk+CiAgICA8L3JkZjpTZXE+CiAgIDwvZGM6Y3JlYXRvcj4KICAgPGRjOmRlc2NyaXB0aW9uPgogICAgPHJkZjpBbHQ+CiAgICAgPHJkZjpsaSB4bWw6bGFuZz0ieC1kZWZhdWx0Ij5TZXJ2aWNlIHRvb2xzIGljb24gb24gd2hpdGUgYmFja2dyb3VuZC4gVmVjdG9yIGlsbHVzdHJhdGlvbi48L3JkZjpsaT4KICAgIDwvcmRmOkFsdD4KICAgPC9kYzpkZXNjcmlwdGlvbj4KICA8L3JkZjpEZXNjcmlwdGlvbj4KIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/PmWJCnkAAAAGYktHRAD/AP8A/6C9p5MAAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElNRQflAg4LBR0CZnO/AAAARHRFWHRDb21tZW50AFNlcnZpY2UgdG9vbHMgaWNvbiBvbiB3aGl0ZSBiYWNrZ3JvdW5kLiBWZWN0b3IgaWxsdXN0cmF0aW9uLlwvEeIAAAMxSURBVHja7Z1bcuQwCEX7qrLQXlp2ynxNVWbK7dgWj3sl9JvYRhxACD369erW7UMzx/cYaychonAQvXM5ABYkpynoYIiEGdoQog6AYfywBrCxF4zNrX/7McBbuXJe8rXx/KBDULcGsMREzCbeZ4J6ME/9wVH5d95rogZp3npEgPLP3m2iUSGqXBJS5Dr6hmLm8kRuZABYti5TMaailV8LodNQwTTUWk4/WZk75l0kM0aZQdaZjMqkrQDAuyMVJWFjMB4GANXr0lbZBxQKr7IjI7QvVWkok/Jn5UHVh61CYPs+/i7eL9j3y/Au8WqoAIC34k8/9k7N8miLcaGWHwgjZXE/awyYX7h41wKMCskZM2HXAddDkTdglpSjz5bcKPbcCEKwT3+DhxtVpJvkEC7rZSgq32NMSBoXaCdiahDCKrND0fpX8oQlVsQ8IFQZ1VARdIF5wroekAjB07gsAgDUIbQHFENIDEX4CQANIVe8Iw/ASiACLXl28eaf579OPuBa9/mrELUYHQ1t3KHlZZnRcXb2/c7ygXIQZqjDMEzeSrOgCAhqYMvTUE+FKXoVxTxgk3DEPREjGzj3nAk/VaKyB9GVIu4oMyOlrQZgrBBEFG9PAZTfs3amYDGrP9Wl964IeFvtz9JFluIvlEvcdoXDOdxggbDxGwTXcxFRi/LdirKgZUBm7SUdJG69IwSUzAMWgOAq/4hyrZVaJISSNWHFVbEoCFEhyBrCtXS9L+so9oTy8wGqxbQDD350WTjNESVFEB5hdKzUGcV5QtYxVWR2Ssl4Mg9qI9u6FCBInJRXgfEEgtS9Cgrg7kKouq4mdcDNBnEHQvWFTdgdgsqP+MiluVeBM13ahx09AYSWi50gsF+I6vn7BmCEoHR3NBzkpIOw4+XdVBBGQUioblaZHbGlodtB+N/jxqwLX/x/NARfD8ADxTOCKIcwE4Lw0OIbguMYcGTlymEpHYLXIKx8zQEqIfS2lGJPaADFEBR/PMH79ErqtpnZmTBlvM4wgihPWDEEhXn1LISj50crNgfCp+dWHYQRCfb2zgfnBZmKGAyi914anK9Coi4LOMhoAn3uVtn+AGnLKxPUZnCuAAAAAElFTkSuQmCC';
    const img = Buffer.from(imgdata, 'base64');

    var favicon = (method, tokens, query, body) => {
        console.log('serving favicon...');
        const headers = {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        };
        let result = img;

        return {
            headers,
            result
        };
    };

    var require$$0 = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n    <meta charset=\"UTF-8\">\r\n    <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\r\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n    <title>SUPS Admin Panel</title>\r\n    <style>\r\n        * {\r\n            padding: 0;\r\n            margin: 0;\r\n        }\r\n\r\n        body {\r\n            padding: 32px;\r\n            font-size: 16px;\r\n        }\r\n\r\n        .layout::after {\r\n            content: '';\r\n            clear: both;\r\n            display: table;\r\n        }\r\n\r\n        .col {\r\n            display: block;\r\n            float: left;\r\n        }\r\n\r\n        p {\r\n            padding: 8px 16px;\r\n        }\r\n\r\n        table {\r\n            border-collapse: collapse;\r\n        }\r\n\r\n        caption {\r\n            font-size: 120%;\r\n            text-align: left;\r\n            padding: 4px 8px;\r\n            font-weight: bold;\r\n            background-color: #ddd;\r\n        }\r\n\r\n        table, tr, th, td {\r\n            border: 1px solid #ddd;\r\n        }\r\n\r\n        th, td {\r\n            padding: 4px 8px;\r\n        }\r\n\r\n        ul {\r\n            list-style: none;\r\n        }\r\n\r\n        .collection-list a {\r\n            display: block;\r\n            width: 120px;\r\n            padding: 4px 8px;\r\n            text-decoration: none;\r\n            color: black;\r\n            background-color: #ccc;\r\n        }\r\n        .collection-list a:hover {\r\n            background-color: #ddd;\r\n        }\r\n        .collection-list a:visited {\r\n            color: black;\r\n        }\r\n    </style>\r\n    <script type=\"module\">\nimport { html, render } from 'https://unpkg.com/lit-html@1.3.0?module';\nimport { until } from 'https://unpkg.com/lit-html@1.3.0/directives/until?module';\n\nconst api = {\r\n    async get(url) {\r\n        return json(url);\r\n    },\r\n    async post(url, body) {\r\n        return json(url, {\r\n            method: 'POST',\r\n            headers: { 'Content-Type': 'application/json' },\r\n            body: JSON.stringify(body)\r\n        });\r\n    }\r\n};\r\n\r\nasync function json(url, options) {\r\n    return await (await fetch('/' + url, options)).json();\r\n}\r\n\r\nasync function getCollections() {\r\n    return api.get('data');\r\n}\r\n\r\nasync function getRecords(collection) {\r\n    return api.get('data/' + collection);\r\n}\r\n\r\nasync function getThrottling() {\r\n    return api.get('util/throttle');\r\n}\r\n\r\nasync function setThrottling(throttle) {\r\n    return api.post('util', { throttle });\r\n}\n\nasync function collectionList(onSelect) {\r\n    const collections = await getCollections();\r\n\r\n    return html`\r\n    <ul class=\"collection-list\">\r\n        ${collections.map(collectionLi)}\r\n    </ul>`;\r\n\r\n    function collectionLi(name) {\r\n        return html`<li><a href=\"javascript:void(0)\" @click=${(ev) => onSelect(ev, name)}>${name}</a></li>`;\r\n    }\r\n}\n\nasync function recordTable(collectionName) {\r\n    const records = await getRecords(collectionName);\r\n    const layout = getLayout(records);\r\n\r\n    return html`\r\n    <table>\r\n        <caption>${collectionName}</caption>\r\n        <thead>\r\n            <tr>${layout.map(f => html`<th>${f}</th>`)}</tr>\r\n        </thead>\r\n        <tbody>\r\n            ${records.map(r => recordRow(r, layout))}\r\n        </tbody>\r\n    </table>`;\r\n}\r\n\r\nfunction getLayout(records) {\r\n    const result = new Set(['_id']);\r\n    records.forEach(r => Object.keys(r).forEach(k => result.add(k)));\r\n\r\n    return [...result.keys()];\r\n}\r\n\r\nfunction recordRow(record, layout) {\r\n    return html`\r\n    <tr>\r\n        ${layout.map(f => html`<td>${JSON.stringify(record[f]) || html`<span>(missing)</span>`}</td>`)}\r\n    </tr>`;\r\n}\n\nasync function throttlePanel(display) {\r\n    const active = await getThrottling();\r\n\r\n    return html`\r\n    <p>\r\n        Request throttling: </span>${active}</span>\r\n        <button @click=${(ev) => set(ev, true)}>Enable</button>\r\n        <button @click=${(ev) => set(ev, false)}>Disable</button>\r\n    </p>`;\r\n\r\n    async function set(ev, state) {\r\n        ev.target.disabled = true;\r\n        await setThrottling(state);\r\n        display();\r\n    }\r\n}\n\n//import page from '//unpkg.com/page/page.mjs';\r\n\r\n\r\nfunction start() {\r\n    const main = document.querySelector('main');\r\n    editor(main);\r\n}\r\n\r\nasync function editor(main) {\r\n    let list = html`<div class=\"col\">Loading&hellip;</div>`;\r\n    let viewer = html`<div class=\"col\">\r\n    <p>Select collection to view records</p>\r\n</div>`;\r\n    display();\r\n\r\n    list = html`<div class=\"col\">${await collectionList(onSelect)}</div>`;\r\n    display();\r\n\r\n    async function display() {\r\n        render(html`\r\n        <section class=\"layout\">\r\n            ${until(throttlePanel(display), html`<p>Loading</p>`)}\r\n        </section>\r\n        <section class=\"layout\">\r\n            ${list}\r\n            ${viewer}\r\n        </section>`, main);\r\n    }\r\n\r\n    async function onSelect(ev, name) {\r\n        ev.preventDefault();\r\n        viewer = html`<div class=\"col\">${await recordTable(name)}</div>`;\r\n        display();\r\n    }\r\n}\r\n\r\nstart();\n\n</script>\r\n</head>\r\n<body>\r\n    <main>\r\n        Loading&hellip;\r\n    </main>\r\n</body>\r\n</html>";

    const mode = process.argv[2] == '-dev' ? 'dev' : 'prod';

    const files = {
        index: mode == 'prod' ? require$$0 : fs__default['default'].readFileSync('./client/index.html', 'utf-8')
    };

    var admin = (method, tokens, query, body) => {
        const headers = {
            'Content-Type': 'text/html'
        };
        let result = '';

        const resource = tokens.join('/');
        if (resource && resource.split('.').pop() == 'js') {
            headers['Content-Type'] = 'application/javascript';

            files[resource] = files[resource] || fs__default['default'].readFileSync('./client/' + resource, 'utf-8');
            result = files[resource];
        } else {
            result = files.index;
        }

        return {
            headers,
            result
        };
    };

    /*
     * This service requires util plugin
     */

    const utilService = new Service_1();

    utilService.post('*', onRequest);
    utilService.get(':service', getStatus);

    function getStatus(context, tokens, query, body) {
        return context.util[context.params.service];
    }

    function onRequest(context, tokens, query, body) {
        Object.entries(body).forEach(([k,v]) => {
            console.log(`${k} ${v ? 'enabled' : 'disabled'}`);
            context.util[k] = v;
        });
        return '';
    }

    var util$1 = utilService.parseRequest;

    var services = {
        jsonstore,
        users,
        data: data$1,
        favicon,
        admin,
        util: util$1
    };

    const { uuid: uuid$2 } = util;


    function initPlugin(settings) {
        const storage = createInstance(settings.seedData);
        const protectedStorage = createInstance(settings.protectedData);

        return function decoreateContext(context, request) {
            context.storage = storage;
            context.protectedStorage = protectedStorage;
        };
    }


    /**
     * Create storage instance and populate with seed data
     * @param {Object=} seedData Associative array with data. Each property is an object with properties in format {key: value}
     */
    function createInstance(seedData = {}) {
        const collections = new Map();

        // Initialize seed data from file    
        for (let collectionName in seedData) {
            if (seedData.hasOwnProperty(collectionName)) {
                const collection = new Map();
                for (let recordId in seedData[collectionName]) {
                    if (seedData.hasOwnProperty(collectionName)) {
                        collection.set(recordId, seedData[collectionName][recordId]);
                    }
                }
                collections.set(collectionName, collection);
            }
        }


        // Manipulation

        /**
         * Get entry by ID or list of all entries from collection or list of all collections
         * @param {string=} collection Name of collection to access. Throws error if not found. If omitted, returns list of all collections.
         * @param {number|string=} id ID of requested entry. Throws error if not found. If omitted, returns of list all entries in collection.
         * @return {Object} Matching entry.
         */
        function get(collection, id) {
            if (!collection) {
                return [...collections.keys()];
            }
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!id) {
                const entries = [...targetCollection.entries()];
                let result = entries.map(([k, v]) => {
                    return Object.assign(deepCopy(v), { _id: k });
                });
                return result;
            }
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }
            const entry = targetCollection.get(id);
            return Object.assign(deepCopy(entry), { _id: id });
        }

        /**
         * Add new entry to collection. ID will be auto-generated
         * @param {string} collection Name of collection to access. If the collection does not exist, it will be created.
         * @param {Object} data Value to store.
         * @return {Object} Original value with resulting ID under _id property.
         */
        function add(collection, data) {
            const record = assignClean({ _ownerId: data._ownerId }, data);

            let targetCollection = collections.get(collection);
            if (!targetCollection) {
                targetCollection = new Map();
                collections.set(collection, targetCollection);
            }
            let id = uuid$2();
            // Make sure new ID does not match existing value
            while (targetCollection.has(id)) {
                id = uuid$2();
            }

            record._createdOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Replace entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @param {Object} data Value to store. Record will be replaced!
         * @return {Object} Updated entry.
         */
        function set(collection, id, data) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }

            const existing = targetCollection.get(id);
            const record = assignSystemProps(deepCopy(data), existing);
            record._updatedOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Modify entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @param {Object} data Value to store. Shallow merge will be performed!
         * @return {Object} Updated entry.
         */
         function merge(collection, id, data) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }

            const existing = deepCopy(targetCollection.get(id));
            const record = assignClean(existing, data);
            record._updatedOn = Date.now();
            targetCollection.set(id, record);
            return Object.assign(deepCopy(record), { _id: id });
        }

        /**
         * Delete entry by ID
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {number|string} id ID of entry to update. Throws error if not found.
         * @return {{_deletedOn: number}} Server time of deletion.
         */
        function del(collection, id) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            if (!targetCollection.has(id)) {
                throw new ReferenceError('Entry does not exist: ' + id);
            }
            targetCollection.delete(id);

            return { _deletedOn: Date.now() };
        }

        /**
         * Search in collection by query object
         * @param {string} collection Name of collection to access. Throws error if not found.
         * @param {Object} query Query object. Format {prop: value}.
         * @return {Object[]} Array of matching entries.
         */
        function query(collection, query) {
            if (!collections.has(collection)) {
                throw new ReferenceError('Collection does not exist: ' + collection);
            }
            const targetCollection = collections.get(collection);
            const result = [];
            // Iterate entries of target collection and compare each property with the given query
            for (let [key, entry] of [...targetCollection.entries()]) {
                let match = true;
                for (let prop in entry) {
                    if (query.hasOwnProperty(prop)) {
                        const targetValue = query[prop];
                        // Perform lowercase search, if value is string
                        if (typeof targetValue === 'string' && typeof entry[prop] === 'string') {
                            if (targetValue.toLocaleLowerCase() !== entry[prop].toLocaleLowerCase()) {
                                match = false;
                                break;
                            }
                        } else if (targetValue != entry[prop]) {
                            match = false;
                            break;
                        }
                    }
                }

                if (match) {
                    result.push(Object.assign(deepCopy(entry), { _id: key }));
                }
            }

            return result;
        }

        return { get, add, set, merge, delete: del, query };
    }


    function assignSystemProps(target, entry, ...rest) {
        const whitelist = [
            '_id',
            '_createdOn',
            '_updatedOn',
            '_ownerId'
        ];
        for (let prop of whitelist) {
            if (entry.hasOwnProperty(prop)) {
                target[prop] = deepCopy(entry[prop]);
            }
        }
        if (rest.length > 0) {
            Object.assign(target, ...rest);
        }

        return target;
    }


    function assignClean(target, entry, ...rest) {
        const blacklist = [
            '_id',
            '_createdOn',
            '_updatedOn',
            '_ownerId'
        ];
        for (let key in entry) {
            if (blacklist.includes(key) == false) {
                target[key] = deepCopy(entry[key]);
            }
        }
        if (rest.length > 0) {
            Object.assign(target, ...rest);
        }

        return target;
    }

    function deepCopy(value) {
        if (Array.isArray(value)) {
            return value.map(deepCopy);
        } else if (typeof value == 'object') {
            return [...Object.entries(value)].reduce((p, [k, v]) => Object.assign(p, { [k]: deepCopy(v) }), {});
        } else {
            return value;
        }
    }

    var storage = initPlugin;

    const { ConflictError: ConflictError$1, CredentialError: CredentialError$1, RequestError: RequestError$2 } = errors;

    function initPlugin$1(settings) {
        const identity = settings.identity;

        return function decorateContext(context, request) {
            context.auth = {
                register,
                login,
                logout
            };

            const userToken = request.headers['x-authorization'];
            if (userToken !== undefined) {
                let user;
                const session = findSessionByToken(userToken);
                if (session !== undefined) {
                    const userData = context.protectedStorage.get('users', session.userId);
                    if (userData !== undefined) {
                        console.log('Authorized as ' + userData[identity]);
                        user = userData;
                    }
                }
                if (user !== undefined) {
                    context.user = user;
                } else {
                    throw new CredentialError$1('Invalid access token');
                }
            }

            function register(body) {
                if (body.hasOwnProperty(identity) === false ||
                    body.hasOwnProperty('password') === false ||
                    body[identity].length == 0 ||
                    body.password.length == 0) {
                    throw new RequestError$2('Missing fields');
                } else if (context.protectedStorage.query('users', { [identity]: body[identity] }).length !== 0) {
                    throw new ConflictError$1(`A user with the same ${identity} already exists`);
                } else {
                    const newUser = Object.assign({}, body, {
                        [identity]: body[identity],
                        hashedPassword: hash(body.password)
                    });
                    const result = context.protectedStorage.add('users', newUser);
                    delete result.hashedPassword;

                    const session = saveSession(result._id);
                    result.accessToken = session.accessToken;

                    return result;
                }
            }

            function login(body) {
                const targetUser = context.protectedStorage.query('users', { [identity]: body[identity] });
                if (targetUser.length == 1) {
                    if (hash(body.password) === targetUser[0].hashedPassword) {
                        const result = targetUser[0];
                        delete result.hashedPassword;

                        const session = saveSession(result._id);
                        result.accessToken = session.accessToken;

                        return result;
                    } else {
                        throw new CredentialError$1('Login or password don\'t match');
                    }
                } else {
                    throw new CredentialError$1('Login or password don\'t match');
                }
            }

            function logout() {
                if (context.user !== undefined) {
                    const session = findSessionByUserId(context.user._id);
                    if (session !== undefined) {
                        context.protectedStorage.delete('sessions', session._id);
                    }
                } else {
                    throw new CredentialError$1('User session does not exist');
                }
            }

            function saveSession(userId) {
                let session = context.protectedStorage.add('sessions', { userId });
                const accessToken = hash(session._id);
                session = context.protectedStorage.set('sessions', session._id, Object.assign({ accessToken }, session));
                return session;
            }

            function findSessionByToken(userToken) {
                return context.protectedStorage.query('sessions', { accessToken: userToken })[0];
            }

            function findSessionByUserId(userId) {
                return context.protectedStorage.query('sessions', { userId })[0];
            }
        };
    }


    const secret = 'This is not a production server';

    function hash(string) {
        const hash = crypto__default['default'].createHmac('sha256', secret);
        hash.update(string);
        return hash.digest('hex');
    }

    var auth = initPlugin$1;

    function initPlugin$2(settings) {
        const util = {
            throttle: false
        };

        return function decoreateContext(context, request) {
            context.util = util;
        };
    }

    var util$2 = initPlugin$2;

    /*
     * This plugin requires auth and storage plugins
     */

    const { RequestError: RequestError$3, ConflictError: ConflictError$2, CredentialError: CredentialError$2, AuthorizationError: AuthorizationError$2 } = errors;

    function initPlugin$3(settings) {
        const actions = {
            'GET': '.read',
            'POST': '.create',
            'PUT': '.update',
            'PATCH': '.update',
            'DELETE': '.delete'
        };
        const rules = Object.assign({
            '*': {
                '.create': ['User'],
                '.update': ['Owner'],
                '.delete': ['Owner']
            }
        }, settings.rules);

        return function decorateContext(context, request) {
            // special rules (evaluated at run-time)
            const get = (collectionName, id) => {
                return context.storage.get(collectionName, id);
            };
            const isOwner = (user, object) => {
                return user._id == object._ownerId;
            };
            context.rules = {
                get,
                isOwner
            };
            const isAdmin = request.headers.hasOwnProperty('x-admin');

            context.canAccess = canAccess;

            function canAccess(data, newData) {
                const user = context.user;
                const action = actions[request.method];
                let { rule, propRules } = getRule(action, context.params.collection, data);

                if (Array.isArray(rule)) {
                    rule = checkRoles(rule, data);
                } else if (typeof rule == 'string') {
                    rule = !!(eval(rule));
                }
                if (!rule && !isAdmin) {
                    throw new CredentialError$2();
                }
                propRules.map(r => applyPropRule(action, r, user, data, newData));
            }

            function applyPropRule(action, [prop, rule], user, data, newData) {
                // NOTE: user needs to be in scope for eval to work on certain rules
                if (typeof rule == 'string') {
                    rule = !!eval(rule);
                }

                if (rule == false) {
                    if (action == '.create' || action == '.update') {
                        delete newData[prop];
                    } else if (action == '.read') {
                        delete data[prop];
                    }
                }
            }

            function checkRoles(roles, data, newData) {
                if (roles.includes('Guest')) {
                    return true;
                } else if (!context.user && !isAdmin) {
                    throw new AuthorizationError$2();
                } else if (roles.includes('User')) {
                    return true;
                } else if (context.user && roles.includes('Owner')) {
                    return context.user._id == data._ownerId;
                } else {
                    return false;
                }
            }
        };



        function getRule(action, collection, data = {}) {
            let currentRule = ruleOrDefault(true, rules['*'][action]);
            let propRules = [];

            // Top-level rules for the collection
            const collectionRules = rules[collection];
            if (collectionRules !== undefined) {
                // Top-level rule for the specific action for the collection
                currentRule = ruleOrDefault(currentRule, collectionRules[action]);

                // Prop rules
                const allPropRules = collectionRules['*'];
                if (allPropRules !== undefined) {
                    propRules = ruleOrDefault(propRules, getPropRule(allPropRules, action));
                }

                // Rules by record id 
                const recordRules = collectionRules[data._id];
                if (recordRules !== undefined) {
                    currentRule = ruleOrDefault(currentRule, recordRules[action]);
                    propRules = ruleOrDefault(propRules, getPropRule(recordRules, action));
                }
            }

            return {
                rule: currentRule,
                propRules
            };
        }

        function ruleOrDefault(current, rule) {
            return (rule === undefined || rule.length === 0) ? current : rule;
        }

        function getPropRule(record, action) {
            const props = Object
                .entries(record)
                .filter(([k]) => k[0] != '.')
                .filter(([k, v]) => v.hasOwnProperty(action))
                .map(([k, v]) => [k, v[action]]);

            return props;
        }
    }

    var rules = initPlugin$3;

    var identity = "email";
    var protectedData = {
    	users: {
    		"35c62d76-8152-4626-8712-eeb96381bea8": {
    			email: "peter@abv.bg",
    			username: "Peter",
    			hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1"
    		},
    		"847ec027-f659-4086-8032-5173e2f9c93a": {
    			email: "george@abv.bg",
    			username: "George",
    			hashedPassword: "83313014ed3e2391aa1332615d2f053cf5c1bfe05ca1cbcb5582443822df6eb1"
    		},
    		"60f0cf0b-34b0-4abd-9769-8c42f830dffc": {
    			email: "admin@abv.bg",
    			username: "Admin",
    			hashedPassword: "fac7060c3e17e6f151f247eacb2cd5ae80b8c36aedb8764e18a41bbdc16aa302"
    		},
            "9e4bf07c-bfa8-4eaa-ac57-01b27bf1669f":{
                email:"articles@mani.ac",
                username:"the_articles_maniac",
                hashedPassword: "fac7060c3e17e6f151f247eacb2cd5ae80b8c36aedb8764e18a41bbdc16aa302"

            }
    	},
    	sessions: {
    	}
    };
    var seedData = {
    	recipes: {
    		"3987279d-0ad4-4afb-8ca9-5b256ae3b298": {
    			_ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
    			name: "Easy Lasagna",
    			img: "assets/lasagna.jpg",
    			ingredients: [
    				"1 tbsp Ingredient 1",
    				"2 cups Ingredient 2",
    				"500 g  Ingredient 3",
    				"25 g Ingredient 4"
    			],
    			steps: [
    				"Prepare ingredients",
    				"Mix ingredients",
    				"Cook until done"
    			],
    			_createdOn: 1613551279012
    		},
    		"8f414b4f-ab39-4d36-bedb-2ad69da9c830": {
    			_ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
    			name: "Grilled Duck Fillet",
    			img: "assets/roast.jpg",
    			ingredients: [
    				"500 g  Ingredient 1",
    				"3 tbsp Ingredient 2",
    				"2 cups Ingredient 3"
    			],
    			steps: [
    				"Prepare ingredients",
    				"Mix ingredients",
    				"Cook until done"
    			],
    			_createdOn: 1613551344360
    		},
    		"985d9eab-ad2e-4622-a5c8-116261fb1fd2": {
    			_ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
    			name: "Roast Trout",
    			img: "assets/fish.jpg",
    			ingredients: [
    				"4 cups Ingredient 1",
    				"1 tbsp Ingredient 2",
    				"1 tbsp Ingredient 3",
    				"750 g  Ingredient 4",
    				"25 g Ingredient 5"
    			],
    			steps: [
    				"Prepare ingredients",
    				"Mix ingredients",
    				"Cook until done"
    			],
    			_createdOn: 1613551388703
    		}
    	},
    	comments: {
    		"0a272c58-b7ea-4e09-a000-7ec988248f66": {
    			_ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
    			content: "Great recipe!",
    			recipeId: "8f414b4f-ab39-4d36-bedb-2ad69da9c830",
    			_createdOn: 1614260681375,
    			_id: "0a272c58-b7ea-4e09-a000-7ec988248f66"
    		}
    	},
    	records: {
    		i01: {
    			name: "John1",
    			val: 1,
    			_createdOn: 1613551388703
    		},
    		i02: {
    			name: "John2",
    			val: 1,
    			_createdOn: 1613551388713
    		},
    		i03: {
    			name: "John3",
    			val: 2,
    			_createdOn: 1613551388723
    		},
    		i04: {
    			name: "John4",
    			val: 2,
    			_createdOn: 1613551388733
    		},
    		i05: {
    			name: "John5",
    			val: 2,
    			_createdOn: 1613551388743
    		},
    		i06: {
    			name: "John6",
    			val: 3,
    			_createdOn: 1613551388753
    		},
    		i07: {
    			name: "John7",
    			val: 3,
    			_createdOn: 1613551388763
    		},
    		i08: {
    			name: "John8",
    			val: 2,
    			_createdOn: 1613551388773
    		},
    		i09: {
    			name: "John9",
    			val: 3,
    			_createdOn: 1613551388783
    		},
    		i10: {
    			name: "John10",
    			val: 1,
    			_createdOn: 1613551388793
    		}
    	},
    	catches: {
    		"07f260f4-466c-4607-9a33-f7273b24f1b4": {
    			_ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
    			angler: "Paulo Admorim",
    			weight: 636,
    			species: "Atlantic Blue Marlin",
    			location: "Vitoria, Brazil",
    			bait: "trolled pink",
    			captureTime: 80,
    			_createdOn: 1614760714812,
    			_id: "07f260f4-466c-4607-9a33-f7273b24f1b4"
    		},
    		"bdabf5e9-23be-40a1-9f14-9117b6702a9d": {
    			_ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
    			angler: "John Does",
    			weight: 554,
    			species: "Atlantic Blue Marlin",
    			location: "Buenos Aires, Argentina",
    			bait: "trolled pink",
    			captureTime: 120,
    			_createdOn: 1614760782277,
    			_id: "bdabf5e9-23be-40a1-9f14-9117b6702a9d"
    		}
    	},
    	furniture: {
    	},
    	orders: {
    	},
    	movies: {
    		"1240549d-f0e0-497e-ab99-eb8f703713d7": {
    			_ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
    			title: "Black Widow",
    			description: "Natasha Romanoff aka Black Widow confronts the darker parts of her ledger when a dangerous conspiracy with ties to her past arises. Comes on the screens 2020.",
    			img: "https://miro.medium.com/max/735/1*akkAa2CcbKqHsvqVusF3-w.jpeg",
    			_createdOn: 1614935055353,
    			_id: "1240549d-f0e0-497e-ab99-eb8f703713d7"
    		},
    		"143e5265-333e-4150-80e4-16b61de31aa0": {
    			_ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
    			title: "Wonder Woman 1984",
    			description: "Diana must contend with a work colleague and businessman, whose desire for extreme wealth sends the world down a path of destruction, after an ancient artifact that grants wishes goes missing.",
    			img: "https://pbs.twimg.com/media/ETINgKwWAAAyA4r.jpg",
    			_createdOn: 1614935181470,
    			_id: "143e5265-333e-4150-80e4-16b61de31aa0"
    		},
    		"a9bae6d8-793e-46c4-a9db-deb9e3484909": {
    			_ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
    			title: "Top Gun 2",
    			description: "After more than thirty years of service as one of the Navy's top aviators, Pete Mitchell is where he belongs, pushing the envelope as a courageous test pilot and dodging the advancement in rank that would ground him.",
    			img: "https://i.pinimg.com/originals/f2/a4/58/f2a458048757bc6914d559c9e4dc962a.jpg",
    			_createdOn: 1614935268135,
    			_id: "a9bae6d8-793e-46c4-a9db-deb9e3484909"
    		}
    	},
    	likes: {
    	},
    	ideas: {
    		"833e0e57-71dc-42c0-b387-0ce0caf5225e": {
    			_ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
    			title: "Best Pilates Workout To Do At Home",
    			description: "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Minima possimus eveniet ullam aspernatur corporis tempore quia nesciunt nostrum mollitia consequatur. At ducimus amet aliquid magnam nulla sed totam blanditiis ullam atque facilis corrupti quidem nisi iusto saepe, consectetur culpa possimus quos? Repellendus, dicta pariatur! Delectus, placeat debitis error dignissimos nesciunt magni possimus quo nulla, fuga corporis maxime minus nihil doloremque aliquam quia recusandae harum. Molestias dolorum recusandae commodi velit cum sapiente placeat alias rerum illum repudiandae? Suscipit tempore dolore autem, neque debitis quisquam molestias officia hic nesciunt? Obcaecati optio fugit blanditiis, explicabo odio at dicta asperiores distinctio expedita dolor est aperiam earum! Molestias sequi aliquid molestiae, voluptatum doloremque saepe dignissimos quidem quas harum quo. Eum nemo voluptatem hic corrupti officiis eaque et temporibus error totam numquam sequi nostrum assumenda eius voluptatibus quia sed vel, rerum, excepturi maxime? Pariatur, provident hic? Soluta corrupti aspernatur exercitationem vitae accusantium ut ullam dolor quod!",
    			img: "./images/best-pilates-youtube-workouts-2__medium_4x3.jpg",
    			_createdOn: 1615033373504,
    			_id: "833e0e57-71dc-42c0-b387-0ce0caf5225e"
    		},
    		"247efaa7-8a3e-48a7-813f-b5bfdad0f46c": {
    			_ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
    			title: "4 Eady DIY Idea To Try!",
    			description: "Similique rem culpa nemo hic recusandae perspiciatis quidem, quia expedita, sapiente est itaque optio enim placeat voluptates sit, fugit dignissimos tenetur temporibus exercitationem in quis magni sunt vel. Corporis officiis ut sapiente exercitationem consectetur debitis suscipit laborum quo enim iusto, labore, quod quam libero aliquid accusantium! Voluptatum quos porro fugit soluta tempore praesentium ratione dolorum impedit sunt dolores quod labore laudantium beatae architecto perspiciatis natus cupiditate, iure quia aliquid, iusto modi esse!",
    			img: "./images/brightideacropped.jpg",
    			_createdOn: 1615033452480,
    			_id: "247efaa7-8a3e-48a7-813f-b5bfdad0f46c"
    		},
    		"b8608c22-dd57-4b24-948e-b358f536b958": {
    			_ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
    			title: "Dinner Recipe",
    			description: "Consectetur labore et corporis nihil, officiis tempora, hic ex commodi sit aspernatur ad minima? Voluptas nesciunt, blanditiis ex nulla incidunt facere tempora laborum ut aliquid beatae obcaecati quidem reprehenderit consequatur quis iure natus quia totam vel. Amet explicabo quidem repellat unde tempore et totam minima mollitia, adipisci vel autem, enim voluptatem quasi exercitationem dolor cum repudiandae dolores nostrum sit ullam atque dicta, tempora iusto eaque! Rerum debitis voluptate impedit corrupti quibusdam consequatur minima, earum asperiores soluta. A provident reiciendis voluptates et numquam totam eveniet! Dolorum corporis libero dicta laborum illum accusamus ullam?",
    			img: "./images/dinner.jpg",
    			_createdOn: 1615033491967,
    			_id: "b8608c22-dd57-4b24-948e-b358f536b958"
    		}
    	},
    	catalog: {
    		"53d4dbf5-7f41-47ba-b485-43eccb91cb95": {
    			_ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
    			make: "Table",
    			model: "Swedish",
    			year: 2015,
    			description: "Medium table",
    			price: 235,
    			img: "./images/table.png",
    			material: "Hardwood",
    			_createdOn: 1615545143015,
    			_id: "53d4dbf5-7f41-47ba-b485-43eccb91cb95"
    		},
    		"f5929b5c-bca4-4026-8e6e-c09e73908f77": {
    			_ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
    			make: "Sofa",
    			model: "ES-549-M",
    			year: 2018,
    			description: "Three-person sofa, blue",
    			price: 1200,
    			img: "./images/sofa.jpg",
    			material: "Frame - steel, plastic; Upholstery - fabric",
    			_createdOn: 1615545572296,
    			_id: "f5929b5c-bca4-4026-8e6e-c09e73908f77"
    		},
    		"c7f51805-242b-45ed-ae3e-80b68605141b": {
    			_ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
    			make: "Chair",
    			model: "Bright Dining Collection",
    			year: 2017,
    			description: "Dining chair",
    			price: 180,
    			img: "./images/chair.jpg",
    			material: "Wood laminate; leather",
    			_createdOn: 1615546332126,
    			_id: "c7f51805-242b-45ed-ae3e-80b68605141b"
    		}
    	},
    	teams: {
    		"34a1cab1-81f1-47e5-aec3-ab6c9810efe1": {
    			_ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
    			name: "Storm Troopers",
    			logoUrl: "/assets/atat.png",
    			description: "These ARE the droids we're looking for",
    			_createdOn: 1615737591748,
    			_id: "34a1cab1-81f1-47e5-aec3-ab6c9810efe1"
    		},
    		"dc888b1a-400f-47f3-9619-07607966feb8": {
    			_ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
    			name: "Team Rocket",
    			logoUrl: "/assets/rocket.png",
    			description: "Gotta catch 'em all!",
    			_createdOn: 1615737655083,
    			_id: "dc888b1a-400f-47f3-9619-07607966feb8"
    		},
    		"733fa9a1-26b6-490d-b299-21f120b2f53a": {
    			_ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
    			name: "Minions",
    			logoUrl: "/assets/hydrant.png",
    			description: "Friendly neighbourhood jelly beans, helping evil-doers succeed.",
    			_createdOn: 1615737688036,
    			_id: "733fa9a1-26b6-490d-b299-21f120b2f53a"
    		}
    	},
    	members: {
    		"cc9b0a0f-655d-45d7-9857-0a61c6bb2c4d": {
    			_ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
    			teamId: "34a1cab1-81f1-47e5-aec3-ab6c9810efe1",
    			status: "member",
    			_createdOn: 1616236790262,
    			_updatedOn: 1616236792930
    		},
    		"61a19986-3b86-4347-8ca4-8c074ed87591": {
    			_ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
    			teamId: "dc888b1a-400f-47f3-9619-07607966feb8",
    			status: "member",
    			_createdOn: 1616237188183,
    			_updatedOn: 1616237189016
    		},
    		"8a03aa56-7a82-4a6b-9821-91349fbc552f": {
    			_ownerId: "847ec027-f659-4086-8032-5173e2f9c93a",
    			teamId: "733fa9a1-26b6-490d-b299-21f120b2f53a",
    			status: "member",
    			_createdOn: 1616237193355,
    			_updatedOn: 1616237195145
    		},
    		"9be3ac7d-2c6e-4d74-b187-04105ab7e3d6": {
    			_ownerId: "35c62d76-8152-4626-8712-eeb96381bea8",
    			teamId: "dc888b1a-400f-47f3-9619-07607966feb8",
    			status: "member",
    			_createdOn: 1616237231299,
    			_updatedOn: 1616237235713
    		},
    		"280b4a1a-d0f3-4639-aa54-6d9158365152": {
    			_ownerId: "60f0cf0b-34b0-4abd-9769-8c42f830dffc",
    			teamId: "dc888b1a-400f-47f3-9619-07607966feb8",
    			status: "member",
    			_createdOn: 1616237257265,
    			_updatedOn: 1616237278248
    		},
    		"e797fa57-bf0a-4749-8028-72dba715e5f8": {
    			_ownerId: "60f0cf0b-34b0-4abd-9769-8c42f830dffc",
    			teamId: "34a1cab1-81f1-47e5-aec3-ab6c9810efe1",
    			status: "member",
    			_createdOn: 1616237272948,
    			_updatedOn: 1616237293676
    		}
    	},
        articles:{
                "08639a1b-17bf-430e-a162-8bdbd218de13":{
                    "_ownerId": "60f0cf0b-34b0-4abd-9769-8c42f830dffc",
                    "title": "This town is quite unique",
                    "article": "\nThis town is quite unique, although are there non unique towns?\n If you carefully examinate the geolocation data, you will certainly find every town, village or even large city quite unique. However, uniqueness can differ from place to place a lot.\nTalking about uniqueness, the services we provide here are also unique. For our payment system doesn't work well, we decided to follow quite different approach for our reservation. Here you can reserve a place on a bench in the park, which will be carefully guarded by one of our birds, enheartedly marking your favorite place by painting it thoroughly. Although this way benches right under our bird's nests are best guarded, you may still enjoy an unique place, which no one else shall use!",
                    "image": "https://thumbnails.yayimages.com/1600/0/4b5/4b5ca5.jpg",
                    "_createdOn": 1723666107861,
                    "_id": "08639a1b-17bf-430e-a162-8bdbd218de13"
                },

            "7d4b9dd4-ea56-43d5-8d96-81a61fb1c2ab":{
                    "_ownerId": "9e4bf07c-bfa8-4eaa-ac57-01b27bf1669f",
                    "title": "Thats Me",
                    "article": "Hello, I am Arnaud Palamarchev and I have created my first article!",
                    "image": "data:image/jpeg;base64,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",
                    "_createdOn": 1723881215919,
                    "_id": "7d4b9dd4-ea56-43d5-8d96-81a61fb1c2ab"
                },
            "c585acc7-d786-49a9-b332-859d8a8120df":{
                    "_ownerId": "9e4bf07c-bfa8-4eaa-ac57-01b27bf1669f",
                    "title": "And that, isn't me!",
                    "article": "Morning good! I am me and you're not although you call yourself me as well. ",
                    "image": "data:image/jpeg;base64,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",
                    "_createdOn": 1723881557665,
                    "_id": "c585acc7-d786-49a9-b332-859d8a8120df"
                },
            "7d1ce044-2f90-4aed-b71b-e43b69387a3f":{
                    "_ownerId": "9e4bf07c-bfa8-4eaa-ac57-01b27bf1669f",
                    "title": "One more article",
                    "article": "Aren't those articles enough already?",
                    "image": "data:image/jpeg;base64,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",
                    "_createdOn": 1723881949204,
                    "_id": "7d1ce044-2f90-4aed-b71b-e43b69387a3f"
                },
        }
    };
    var rules$1 = {
    	users: {
    		".create": false,
    		".read": [
    			"Owner"
    		],
    		".update": false,
    		".delete": false
    	},
    	members: {
    		".update": "isOwner(user, get('teams', data.teamId))",
    		".delete": "isOwner(user, get('teams', data.teamId)) || isOwner(user, data)",
    		"*": {
    			teamId: {
    				".update": "newData.teamId = data.teamId"
    			},
    			status: {
    				".create": "newData.status = 'pending'"
    			}
    		}
    	}
    };
    var settings = {
    	identity: identity,
    	protectedData: protectedData,
    	seedData: seedData,
    	rules: rules$1
    };

    const plugins = [
        storage(settings),
        auth(settings),
        util$2(),
        rules(settings)
    ];

    const server = http__default['default'].createServer(requestHandler(plugins, services));

    const port = 3030;
    server.listen(port);
    console.log(`Server started on port ${port}. You can make requests to http://localhost:${port}/`);
    console.log(`Admin panel located at http://localhost:${port}/admin`);

    var softuniPracticeServer = {

    };

    return softuniPracticeServer;

})));
