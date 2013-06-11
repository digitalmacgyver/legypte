from django.conf.urls import patterns, url
from django.conf import settings

from gallery import views

urlpatterns = patterns( '',
                        url( r'^gallery\.js$', views.gallery, name='gallery' ),
                        url( r'^flickruser/(?P<user>[\w]+)/$', views.user, name='user' ),
                        url( r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STATIC_ROOT}),
                        url( r'^$', views.display, name='display' ),
                        )


