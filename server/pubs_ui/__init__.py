import json
import logging
import os
import sys

from authlib.integrations.flask_client import OAuth

from flask import Flask, request
from flask_caching import Cache
from flask_images import Images
from flask_mail import Mail
from graypy import GELFTCPHandler

from whitenoise import WhiteNoise

from .custom_filters import display_publication_info, date_format, w3c_date

# pylint: disable=C0103


def _create_log_handlers(graylog_config=None, log_level=logging.INFO):
    """
    Create a handler object(s). A stream handler will always be created to
    send output to STDOUT.

    If a graylog configuration is specified, a handler will be created to
    push to the graylog server.

    :param dict graylog_config: optional dictionary with `host` and `port` keys, which specify
        the Graylog server's host and the port being listened to. For example, `{'host': '127.0.0.1', 'port': 12201}`.
    :param log_level: the log level to use
    :return: a list of handlers
    :rtype: list

    """

    handlers = [logging.StreamHandler(sys.stdout)]
    if graylog_config is not None:
        handlers.append(GELFTCPHandler(graylog_config['host'], graylog_config['port']))

    def configure_handler(some_handler):
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - {%(pathname)s:L%(lineno)d} - %(message)s')
        some_handler.setFormatter(formatter)
        some_handler.setLevel(log_level)

    map(configure_handler, handlers)
    return handlers


app = Flask(__name__.split()[0], instance_relative_config=True)

# Loads configuration information from config.py and instance/config.py
app.config.from_object('config')  # load configuration before passing the app object to other things
if ('NO_INSTANCE_CONFIG') not in os.environ:
    app.config.from_pyfile('config.py', silent=True)

@app.before_request
def log_request():
    if app.config.get('LOGGING_ON'):
        request_str = str(request)
        request_headers = str(request.headers)
        log_str = 'Request: ({0}); Headers: ({1})'.format(request_str, request_headers)
        app.logger.info(log_str)


if app.config.get('LOGGING_ON'):
    app_log_handlers = _create_log_handlers(app.config.get('GRAYLOG_CONFIG'))
    for app_log_handler in app_log_handlers:
        app.logger.addHandler(app_log_handler)
images = Images(app)
mail = Mail(app)
app.view_functions['images'] = images.handle_request
app.jinja_env.filters['display_pub_info'] = display_publication_info
app.jinja_env.filters['date_format'] = date_format
app.jinja_env.filters['w3c_date'] = w3c_date
app.jinja_env.globals.update(wsgi_str=app.config['WSGI_STR'])
app.jinja_env.globals.update(GOOGLE_ANALYTICS_CODE=app.config['GOOGLE_ANALYTICS_CODE'])
app.jinja_env.globals.update(GOOGLE_WEBMASTER_TOOLS_CODE=app.config['GOOGLE_WEBMASTER_TOOLS_CODE'])
app.jinja_env.globals.update(LAST_MODIFIED=app.config.get('DEPLOYED'))
app.jinja_env.globals.update(ANNOUNCEMENT_BLOCK=app.config['ANNOUNCEMENT_BLOCK'])

#Enable authentication
oauth = OAuth(app)
oauth.register('pubsauth',
               client_kwargs = {'verify': app.config.get('VERIFY_CERT', True)}
               )

# Set up the cache
cache = Cache(app, config={
    'CACHE_TYPE': app.config['CACHE_TYPE'],
    'CACHE_REDIS_HOST': app.config['CACHE_REDIS_HOST'],
    'CACHE_KEY_PREFIX': app.config['CACHE_KEY_PREFIX']
})

# Load static assets manifest file, which maps source file names to the
# corresponding versioned/hashed file name.
_manifest_path = app.config.get('ASSET_MANIFEST_PATH')
if _manifest_path:
    with open(_manifest_path, 'r') as f:
        app.config['ASSET_MANIFEST'] = json.loads(f.read())
        app.logger.info(app.config['ASSET_MANIFEST'])

# Enable Whitenoise which will allow the application when using nginx to serve out the static assets.
if app.config['STATIC_ASSET_PATH']:
    app.wsgi_app = WhiteNoise(app.wsgi_app, root=app.config['STATIC_ASSET_PATH'], prefix='static/')

# Enable CORS, if specified in the configuration.
if app.config.get('FLASK_CORS'):
    from flask_cors import CORS
    CORS(app)

from .auth.views import auth_blueprint
from .manager.views import manager
from .pubswh.views import pubswh
from .metrics.views import metrics
from . import filters  # pylint: disable=C0413

app.register_blueprint(auth_blueprint)
app.register_blueprint(manager, url_prefix='/manager')
app.register_blueprint(metrics, url_prefix='/metrics')
app.register_blueprint(pubswh)
