from django.conf.urls import patterns, url

from gallery import views

urlpatterns = patterns( '',
                        url( r'^gallery\.js$', views.gallery, name='gallery' ),
                        url( r'^flickruser/(?P<user>[\w]+)/$', views.user, name='user' ),
                        url( r'^$', views.display, name='display' ),
                        )


