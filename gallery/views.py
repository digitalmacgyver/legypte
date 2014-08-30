# Django framework stuff
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render, get_object_or_404

# Python libraries
from collections import Counter
import flickrapi
import json
import random

users = [{ 'uid' : '95564854@N02', 'username' : 'legypte'},
         { 'uid' : '83979593@N00', 'username' : 'brooklyn_museum'},
         { 'uid' : '44494372@N05', 'username' : 'nasacommons'},
         { 'uid' : None, 'username' : None},
         ]

def populate_image_data_for_owner(uid):
    f = flickrapi.FlickrAPI(settings.FLICKR_APP_ID,
                            settings.FLICKR_API_SECRET)
    
    # URL types of interest
    url_types = ['m','n','z','c','l','o']

    flickr_images = []

    done = False;
    
    page_number = 1

    if ( uid != 'default' ):
        uid = f.people_findByUsername( username=uid )[0].get( 'nsid' )

    try:
        while ( not done ):
            if ( uid == 'default' ):
                download_set =  f.photosets_getPhotos(
                    photoset_id = '72157634011366503',
                    extras = 'tags,url_' + ',url_'.join( url_types ),
                    per_page = 500,
                    page = page_number )[0]
            else:
                download_set =  f.people_getPublicPhotos(
                    user_id = uid,
                    extras = 'tags,url_' + ',url_'.join( url_types ),
                    per_page = 500,
                    page = page_number )[0]

            flickr_images += download_set

            if ( len( download_set ) == 500 ):
                page_number += 1
            else:
                done = True
    except Exception as e:
        print "ERROR:", e

    source_info = {
        'source_my_photos' : {
            'display' : 'My Photos',
            'tags' : {}
            }
        }
    images = []

    # We iterate over our sources, however each source can return
    # redundant images (e.g. an image can be provided by more than one
    # source).  We keep track of all the images we've seen and prevent
    # adding diplicates to our images array.
    #
    # The keys of this dictionary are globally unique Flickr image
    # IDs, the values are the index in our images data structure we're
    # composing of that image.
    existing_images = {}

    # We include tags from multiple sources, however we want a unique
    # mapping of tags to tag_ids.  We have to generate tag_ids instead
    # of just using the tag text because tag values don't have to
    # correpond to HTML identifiers and we want to be able to refer to
    # these things uniquely in the DOM.
    existing_tags = {}
    tag_number = 1

    for source in source_info:
        for image in flickr_images:
            if image.get( 'id' ) in existing_images:
                # Indicate that this image is also provided by the
                # current source.
                if not source in images[existing_images[image.get( 'id' )]]['sources']:
                    images[existing_images[image.get( 'id' )]]['sources'][source] = 1
            else:
                i = {
                    'id'      : image.get( 'id' ),
                    'title'   : image.get( 'title' ),
                    'tags'    : {},
                    'sizes'   : [],
                    'sources' : { source : 1 }
                    }
                # Our tags may not be valid HTML identifiers, so
                # provide some handle on them, store this handle in
                # two places: the tags property of the image data
                # structure, and the tags property provided by this
                # source.
                for tag in image.get( 'tags' ).split():
                    tag_id = None
                    if tag in existing_tags:
                        tag_id = existing_tags[tag];
                    else:
                        tag_id = "tag_id_" + str(tag_number)
                        existing_tags[tag] = tag_id
                        tag_number += 1
                    source_info[source]['tags'][tag] = tag_id
                    i['tags'][tag] = tag_id
                for url_type in url_types:
                    url = image.get( 'url_' + url_type )
                    if url:
                        i['sizes'].append( {
                                'url' : url,
                                'width'  : image.get( 'width_'  + url_type ),
                                'height' : image.get( 'height_' + url_type ),
                                } )
                i['sizes'].sort( key=lambda x: int( x['width'] ) )
                images.append( i )
                # Image ID -> array offset in images array lookup.
                existing_images[i['id']] = len( images ) - 1

    random.shuffle( images )
    return ( source_info, images )

def display( request ):
    return render(request, 'gallery/display.html', { 'user' : False } )

def user_display( request, user ):
    return render( request, 'gallery/display.html', { 'user' : user} )

def gallery( request ):
#    (source_info, images) = populate_image_data_for_owner('95564854@N02')
#    (source_info, images) = populate_image_data_for_owner('44494372@N05')
    ( source_info, images ) = populate_image_data_for_owner( 'default' )
    return render(request, 'gallery/gallery.js', { 
            'sources' : json.dumps(source_info),
            'images' : json.dumps(images) 
            })

def user_gallery( request, user ):
    ( source_info, images ) = populate_image_data_for_owner( user )
    return render(request, 'gallery/gallery.js', { 
            'sources' : json.dumps(source_info),
            'images' : json.dumps(images) 
            })

