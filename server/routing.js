const logger = require('./logger');

module.exports = function(app, fs, express, config) {
    //var firstRun = true;
    const data = require('../server/data.js');
    const helpers = require('../server/helpers.js');
    var cachedAmpCss;

    // Reloads the CSS if in dev mode.
    var ampCss = function() {
        if (cachedAmpCss == null || config.dev) {
            cachedAmpCss = fs.readFileSync('./public/css/amp.css', 'utf8');
        }

        return cachedAmpCss;
    }

    var setupController = (page) => {
        try {
            require('../server/controllers/' + page.controller + 'Controller.js')(app, fs, express, config, data, helpers, page);
        } catch (e) {
            logger.error('Failed to render page with name: ' + page.name, e);
        }
    };

    var setupControllers = (obj) => {
        for (let key of Object.keys(obj)) {
            var page = obj[key];

            /*
                if (!helpers.isObject(page)) {
                    continue;
                }
            */

            if (typeof page.controller !== 'undefined') {
                setupController(page);
            }

            if (typeof page.children !== 'undefined' && page.children.length > 0) {
                setupControllers(page.children);
            }
        }
    };

    setupControllers(data());

    require('../server/controllers/redirectsController.js')(app, fs, express, config, data, helpers);
    require('../server/controllers/rssController.js')(app, fs, express, config, data, helpers);
    require('../server/controllers/sitemapXmlController.js')(app, fs, express, config, data, helpers);

    // Load each controller and run them.
    /*
        fs.readdirSync('./server/controllers/').forEach(function(file) {
            require('../server/controllers/' + page.controller + 'Controller.js')(app, ampCss, express, config, logger, data, helpers);
        });
    */

    /////////////////
    // Static files
    /////////////////

    app.use(express.static('./public'));

    // Just used for verifying SSL with Let's Encrypt.
    app.use('/.well-known', express.static('./.well-known'));

    if (global.dev) {
        app.use(express.static('./src'));
    }

    /////////////////
    // Statuses
    /////////////////

    // These have to be setup after everything else.

    if (!global.dev) {
        app.use((req, res, next) => {
            logger.info('404 error: %s', req.originalUrl);

            res.status(404).render('page', {
                helpers: helpers,
                layout: '_common',
                relativeUrl: '404',
                pageGroup: '',
                pageTitle: 'Status: 404',
                bodyText: '<p>You\'re looking for a page that doesn\'t exist...</p><p>Man, what a boring page. I should probably make it a bit more interesting. I\'ll add that to the to-do list.</p>',
                page: {
                    controller: 'page'
                }
            });
        });

        app.use((err, req, res, next) => {
            logger.error('500 error: %s', err.stack);

            res.status(500).render('page', {
                helpers: helpers,
                layout: '_common',
                relativeUrl: '500',
                pageGroup: '',
                pageTitle: 'Status: 500',
                bodyText: '<p>Oh no. This page has an error... I\'m probably not even aware of this.</p><p>Do you mind getting in contact with me about it? I\'m on <a href="https://twitter.com/Harvzor" target="_blank">Twitter</a>.</p>',
                page: {
                    controller: 'page'
                }
            });
        });
    }
};
