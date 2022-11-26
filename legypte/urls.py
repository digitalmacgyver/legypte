from django.urls import include, path

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns = [
    # Examples:
    # url(r'^$', 'legypte.views.home', name='home'),
    # url(r'^legypte/', include('legypte.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # url(r'^admin/', include(admin.site.urls)),
#                       url( r'^$', include( 'gallery.urls', namespace='gallery' ) ),
    path( r'', include( 'gallery.urls' ) ),
]
