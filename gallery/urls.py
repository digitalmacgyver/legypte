from django.urls import path, re_path
from django.conf import settings
from django.conf.urls.static import static

from gallery import views

urlpatterns = [
    re_path( r'^gallery\.js$', views.gallery, name='gallery' ),
    re_path( r'^flickr/(?P<user>[\w]+)/gallery\.js$', views.user_gallery, name='user' ),
    re_path( r'^flickr/(?P<user>[\w]+)/$', views.user_display, name='user' ),
    #re_path( r'^static/(?P<path>.*)$', django.views.static.serve, {'document_root': settings.STATIC_ROOT}),
    #re_path( r'^static/(?P<path>.*)$', static( settings.STATIC_URL, document_root=settings.STATIC_ROOT ) ),
    re_path( r'^$', views.display, name='display' ),
] + static( settings.STATIC_URL, document_root=settings.STATIC_ROOT )
