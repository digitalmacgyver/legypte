# Django settings for legypte project.

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DEBUG = os.environ.get('DJANGO_DEBUG', 'False') == 'True'

ADMINS = (
    ( 'Matthew Hayward', 'mjhayward+legypte-admin@gmail.com'),
)

MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql', # PostgreSQL for Heroku
        'NAME': '',                      # Or path to database file if using sqlite3.
        # The following settings are not used with sqlite3:
        'USER': '',
        'PASSWORD': '',
        'HOST': '',                      # Empty for localhost through domain sockets or '127.0.0.1' for localhost through TCP.
        'PORT': '',                      # Set to empty string for default.
    }
}

# Hosts/domain names that are valid for this site; required if DEBUG is False
# See https://docs.djangoproject.com/en/1.5/ref/settings/#allowed-hosts
ALLOWED_HOSTS = [ 'legypte.herokuapp.com', '127.0.0.1', 'localhost', '.delegypte.com' ]

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'America/Los_Angeles'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/var/www/example.com/media/"
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://example.com/media/", "http://media.example.com/"
MEDIA_URL = ''

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/var/www/example.com/static/"
STATIC_ROOT = os.path.join( BASE_DIR, 'staticfiles' )

# URL prefix for static files.
# Example: "http://example.com/static/", "http://static.example.com/"
STATIC_URL = '/static/'

# WhiteNoise configuration for static files
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

#PROJECT_PATH = os.path.dirname( "%s/../../gallery/" % os.path.abspath( __file__ ) )

# Additional locations of static files
#STATICFILES_DIRS = [
#    # Put strings here, like "/home/html/static" or "C:/www/django/static".
#    # Always use forward slashes, even on Windows.
#    # Don't forget to use absolute paths, not relative paths.
#    os.path.join( PROJECT_PATH, 'static' ),
#    os.path.join( BASE_DIR, 'gallery/static' ),
#]

# List of finder classes that know how to find static files in
# various locations.
#STATICFILES_FINDERS = (
#    'django.contrib.staticfiles.finders.FileSystemFinder',
#    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
#)

# Make this unique, and don't share it with anybody.
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'sh&1p)1b@vk(hfin8me&*kb0$=3qo02dbb3p$l1ivfpj&84@sy')

# List of callables that know how to import templates from various sources.
#TEMPLATE_LOADERS = (
#    'django.template.loaders.filesystem.Loader',
#    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
#)

#MIDDLEWARE_CLASSES = (
#    'django.middleware.common.CommonMiddleware',
#    'django.contrib.sessions.middleware.SessionMiddleware',
#    'django.middleware.csrf.CsrfViewMiddleware',
#    'django.contrib.auth.middleware.AuthenticationMiddleware',
#    'django.contrib.messages.middleware.MessageMiddleware',
#    # Uncomment the next line for simple clickjacking protection:
#    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',
#)

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'legypte.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'legypte.wsgi.application'

#TEMPLATE_DIRS = (
#    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
#    # Always use forward slashes, even on Windows.
#    # Don't forget to use absolute paths, not relative paths.
#)

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'APP_DIRS': True,
    }
]

INSTALLED_APPS = (
    #'django.contrib.auth',
    #'django.contrib.contenttypes',
    #'django.contrib.sessions',
    #'django.contrib.sites',
    #'django.contrib.messages',
    'django.contrib.staticfiles',
    'gallery',
    # Uncomment the next line to enable the admin:
    # 'django.contrib.admin',
    # Uncomment the next line to enable admin documentation:
    # 'django.contrib.admindocs',
)

FLICKR_APP_ID = os.environ.get('FLICKR_APP_ID', 'fe295978f4f7713eafa0ed662c1e07de')
FLICKR_API_SECRET = os.environ.get('FLICKR_API_SECRET', '63c67768e046bf0e')

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
#LOGGING = {
#    'version': 1,
#    'disable_existing_loggers': False,
#    'filters': {
#        'require_debug_false': {
#            '()': 'django.utils.log.RequireDebugFalse'
#        }
#    },
#    'handlers': {
#        'mail_admins': {
#            'level': 'ERROR',
#            'filters': ['require_debug_false'],
#            'class': 'django.utils.log.AdminEmailHandler'
#        }
#    },
#    'loggers': {
#        'django.request': {
#            'handlers': ['mail_admins'],
#            'level': 'ERROR',
#            'propagate': True,
#        },
#    }
#}

import dj_database_url
DATABASES['default'] = dj_database_url.config()

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Default auto field
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
