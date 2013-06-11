from django.conf.urls import patterns, url
from django.conf import settings

from gallery import views

urlpatterns = patterns( '',
                        url( r'^gallery\.js$', views.gallery, name='gallery' ),
                        url( r'^flickr/(?P<user>[\w]+)/gallery\.js$', views.user_gallery, name='user' ),
                        url( r'^flickr/(?P<user>[\w]+)/$', views.user_display, name='user' ),
                        url( r'^static/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.STATIC_ROOT}),
                        url( r'^$', views.display, name='display' ),
                        )


