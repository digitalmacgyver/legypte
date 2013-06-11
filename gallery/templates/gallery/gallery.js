"use strict";

/* 
Documentation:

We rely on the server to ensure that sources and tags have unique and
HTML valid identifiers.

TBD:

0. Adjust height / max-height on control panel.

0. Adjust animation on control panel so it doesn't bounce / take a
long time to show up.

- Test on multiple browsers

- Sort gallery order by oldest to newest, or by random
- Add the current slide duration in seconds to the input form element.
- Enter, space, and right arrow go to next image
- See if we can clean up the code a bit by only specifying the width
  or height of the image and letting the browser scale it.
- Add thead/tbody
- check if tags with <>"'& screw things up.

- Consider broad code refactoring into OO model, images, tags,
  etc. are objects.  I am sort of doing 1/2 OO with this large hard to
  maintain State object, but data and code are distributed through the
  application with no encapsulation.

Rethink: On change events for radion buttons adjust the value of
tags, value of active tags could be one of 'include|exclude'

1) Enable image next selection logic.
2) Fix form logic.
3) Fix overlay div sizing.
*/

function gallery_player() {
    // Configuration and State
    var State = {
	// Internal data
	
	// Reference to our pending gallery_show function so we can
	// cancel multiple chains of calls to gallery_show.
	timer : undefined,
	
	// sources:
	// { source_id1 : { display : 'My Photos', tags: 
	//                     { 'Tag Name 1' : tag_id_1, ...
	//
	// source_id and tag_ids are valid HTML identifiers.  Display
	// and the tag keys are the display names of those things.
	sources: {}, 

	// images:
	// [ { id : ..., title : ...
	//   sources : { source_id1, ... }
	//   tags : { 'Tag Name' : tag_id_1, 'Second Tag' : tag_id_2, ... }
	//   sizes : [ { url : ..., width : 100, height: 200 } , ... ]
	//
	//  Keys of sources index into State.sources.
	//  tags have the same formatting as sources.tags
        //  The sizes array is sorted from smallest to largest.
	images: [],

	// The index in our images array of the current image.
	current_image: 0,
	// The index in our images array of the next image.
	next_image: 0,

	// Active sources
	// { source_name1 : 1, source_name2 : 2, ... }
	//
	// The sources that are currently selected in our control panel.
	active_sources: {},

	// Active tags
	// { tag_name : { 
	//               active_sources : { source1 : 1, source2 : 1, ...},
	//               tag_id_prefix : tag_id_prefix,
	//               visible : boolean,
	//               setting : include|exclude|unset
        //              },
	//   tag_name2 : { ... },
	//
	// What tags are presently visible / usable in our control
	// panel, and the sources that provide them, and 
	tags: {},

	// Control panel data - Selection
	show_untagged: false,
	any_or_all: "any",
	
	// Control panel data - Options
	slide_duration: 10000,
	order: "random",
    };
    
    // This is replaced by the Django template system to be a JSON
    // data structure.
    State.images = {{ images|safe }};
    State.sources = {{ sources|safe }};
    
    // Main logic.
    build_control_panel();
    
    gallery_show();

    // Static Behaviors
    // E.g. behaviors on HTML elements present in the base source.
    //
    // Dynamic behaviors are defined inline with the creation of the
    // elements in question.
    
    $( window ).resize( function() {
	var img = get_best_size( State.images[State.current_image] );
	
	$( "#slide_show" )
	    .attr( 'src', img['url'] )
	    .width( img['img_width'] )
	    .height( img['img_height'] );

	$( "#control_panel" ).css( 'height', ( $( window ).height() - 50 ) + "px" );
    } );
    
    $( "#full_screen" ).click( function() {
	full_screen( true );
    } );
    
    $( "#show_control_panel" ).mouseenter( 
	function() { 
	    // DEBUG make opacity stops of control panel configurable.
	    $( "#control_panel" ).stop( true, true ).slideDown().animate( { opacity: 0.9 } );
	    $( this ).stop( true, true ).animate( { opacity: 1 } )
	}
    );

    $( "#control_panel" ).mouseleave( { opacity: 0.2, duration: 10000 }, hide_control_panel );

    $( "#start_show" ).on( 'click', { opacity: 0, duration: 3000 }, process_form );

    $( "#slide_duration" ).on( 'change', update_slide_duration );

    $( "#any_or_all_any" ).on( 'change', update_any_or_all );
    $( "#any_or_all_all" ).on( 'change', update_any_or_all );

    $( "#clear_all" ).on( 'click', { new_property: false }, set_all_tags );

    $( "#include_untagged" ).on( 'change', update_show_tagged );

    // Helper functions

    function update_show_tagged( event ) {
	State.show_untagged = event.target.checked;
    }

    function update_slide_duration( event ) {
	var new_duration = Number( event.target.value );
	if ( new_duration && (new_duration > 0) ) {
	    State.slide_duration = new_duration * 1000;
	}
	gallery_show();
    }
    
    function update_any_or_all( event ) {
	State.any_or_all = event.target.value;
    }

    function process_form( event ) {
	hide_control_panel( event );

	State.next_image = get_next_image();
	gallery_show();
    }

    function sources_update_tags( event ) {
	var checked_sources = [];
	var enabled_sources = []; // Newly enabled
	var disabled_sources = []; // Newly disabled

	$( "#sources input:checked" ).each(function ( index ) {
	    checked_sources.push( this.id );
	});

	// For each source overall
	for ( var source in State.sources ) {
	    if ( !State.sources.hasOwnProperty( source ) ) continue;
	    
	    var checked = false;
	    
	    // Determine if it is currently checked.
	    for ( var i = 0 ; i < checked_sources.length ; i++ ) {
		if ( source === checked_sources[i] ) {
		    // It is checked
		    checked = true;
		    
		    if ( !(source in State.active_sources) ) {
			// And formerly wasn't checked.
			enabled_sources.push( source );
			State.active_sources[source] = 1;
		    }
		}
	    }
	    // It is not checked
	    if ( !checked ) {
		if ( source in State.active_sources ) {
		    // And formerly was checked.
		    disabled_sources.push( source );
		    delete( State.active_sources[source] );
		}
	    }
	}
	update_tag_visibility( enabled_sources, disabled_sources );
    }
    
    // Takes in an array of sources that were enabled, and an array of
    // sources that were disabled.
    function update_tag_visibility( enabled_sources, disabled_sources ) {
	var tags_to_display = [];
	var tags_to_hide = [];

	calculate_tag_visibility( enabled_sources, disabled_sources, 
				  tags_to_display, tags_to_hide );

	var display_selector = '';
	for ( var i = 0 ; i < tags_to_display.length ; i++ ) {
	    display_selector += '#' + State.tags[tags_to_display[i]].tag_id_prefix + '_row,';
	    State.tags[tags_to_display[i]].visible = true;
	}
	display_selector = display_selector.slice( 0, -1 );

	// DEBUG make the animation duration a configurable - the
	// animation is a bit obnoxious when there are many many tags.
	$( display_selector ).show( 1000 );

	var hide_selector = '';
	for ( var i = 0 ; i < tags_to_hide.length ; i++ ) {
	    hide_selector += '#' + State.tags[tags_to_hide[i]].tag_id_prefix + '_row,';
	    State.tags[tags_to_hide[i]].visible = false;
	}
	hide_selector = hide_selector.slice( 0, -1 );

	// DEBUG make the animation duration a configurable - the
	// animation is a bit obnoxious when there are many many tags.
	$( hide_selector ).hide( 1000 );
    }

    function calculate_tag_visibility( enabled_sources, disabled_sources, 
				       tags_to_display, tags_to_hide ) {

	for ( var i = 0 ; i < enabled_sources.length ; i++ ) {
	    var enabled_tags = State.sources[enabled_sources[i]].tags;
	    for ( var tag in enabled_tags ) {
		if ( !enabled_tags.hasOwnProperty( tag ) ) continue;

		State.tags[tag].active_sources[enabled_sources[i]] = 1;
		if ( Object.keys( State.tags[tag].active_sources ).length == 1) {
		    tags_to_display.push( tag );
		}
	    }
	}
	
	for ( var i = 0 ; i < disabled_sources.length ; i++ ) {
	    var disabled_tags = State.sources[disabled_sources[i]].tags;
	    for ( var tag in disabled_tags ) {
		if ( !disabled_tags.hasOwnProperty( tag ) ) continue;

		if ( (tag in State.tags) ) {
		    delete( State.tags[tag].active_sources[disabled_sources[i]] );
		    if ( Object.keys( State.tags[tag].active_sources ).length == 0 ) {
			tags_to_hide.push( tag );
		    }
		}
	    }
	}
	return;
    }

    function get_tag_by_id( tag_id ) {
	for ( var tag in State.tags ) {
	    if ( !State.tags.hasOwnProperty( tag ) ) continue;
	    if ( State.tags[tag].tag_id_prefix === tag_id.slice( 0, -8 ) ) {
		return tag;
	    }
	}
	return;
    }

    // DEBUG Cut the length of this function in half.
    function handle_tag_changes( event ) {
	// Has to do a few things:
	// 1) Bail out unless the event is for a tag radio button.
	// 2) Make radion buttons set to 'include' or 'exclude'
	var tag_id = event.target.id;
	if ( tag_id.slice( 0, 6 ) === 'tag_id' ) {
	    var tag = get_tag_by_id( tag_id );
	    if ( tag_id.slice( -7 ) === 'include' ) {
		// Include
		if ( event.target.checked ) {
		    State.tags[tag].setting = 'include';
		} else if ( State.tags[tag].setting === 'include' ) {
		    State.tags[tag].setting = 'unset';
		}
	    } else {
		// Exclude
		if ( event.target.checked ) {
		    State.tags[tag].setting = 'exclude';
		} else if ( State.tags[tag].setting === 'exclude' ){
		    State.tags[tag].setting = 'unset';
		}
	    }
	}
	return;
    }

    function tag_table_row_html(tag, tag_id) {
	var tag_element = '';
	tag_element += '<tr id="' + tag_id + '_row">';
	tag_element += '  <td>' + tag + '</td>';
	tag_element += '  <td><input type="radio" name="' + tag_id + '" id="' + tag_id + '_include" value="include" /></td>';
	tag_element += '  <td><input type="radio" name="' + tag_id + '" id="' + tag_id + '_exclude" value="exclude" /></td>';
	tag_element += '</tr>';
	return tag_element;
    }

    function add_sources_and_tags_to_control() {
	var source_elements = '';
	var tag_elements = '';

	for ( var source in State.sources ) {
	    if ( !State.sources.hasOwnProperty( source ) ) continue;

	    // Source stuff.
	    source_elements += '<label><input type="checkbox" name="' + source + '" id="' + source + '" />' + State.sources[source].display  + '</label>';
	    State.active_sources[source] = 1;
		
	    // Tag stuff.  Each source can have overlapping tag
	    // names, take care not to add the tags over and over.
	    var source_tags = State.sources[source].tags
	    for ( var tag in source_tags ) {
		if ( !source_tags.hasOwnProperty( tag ) ) continue;

		if ( !State.tags[tag] ) {
		    State.tags[tag] = {
			active_sources : { },
			tag_id_prefix  : source_tags[tag],
			visible        : true,
			setting        : 'unset'
		    };
		}
		State.tags[tag].active_sources[source] = 1;
	    }
	}

	// Tag stuff - this needs to be run before we add the source
	// stuff to the DOM below, as the source stuff refers
	// potentially to tag elements and events.
	//
	// We want our keys output in alphabetical order.
	for ( var keys = Object.keys( State.tags ).sort( case_insensitive_sort ), i = 0 ; 
	      i < keys.length ; 
	      i++ ) {
		tag_elements += tag_table_row_html( keys[i], State.tags[keys[i]].tag_id_prefix );
	}
	// Insert into DOM.
	$( "#tag_body" ).append( tag_elements );
	// Add an event for when a radio button is changed.
	$( "#tags" ).on( 'change', handle_tag_changes );
	// Activate the select-all button.
	$( "#select_all" ).on( 'click', { new_property: true}, set_all_tags );
	// Turn all the tags on.
	$( "#select_all" ).click();

	// Source stuff
	// Insert into DOM.
	$( "#sources" ).append( source_elements );
	// Bind events.
	$( "#sources" ).on( 'change', sources_update_tags );
	// Initially all sources are active.
	$( "#sources :checkbox" ).prop( 'checked', true ).change();
	return;
    }

    function case_insensitive_sort( a, b ) {
	var c = a.toLowerCase();
	var d = b.toLowerCase();
	if (c < d) return -1;
	if (c > d) return 1;
	return 0;
    }

    function set_all_tags( event ) {
	$( "#tags input:radio[value='include']" )
	    .prop( 'checked', event.data.new_property )
	    .change();
    }

   function hide_control_panel( event ) {
	var opacity = event.data.opacity;
	var duration = event.data.duration;
       // DEBUG Fix the opacity of the control panel to be a
       // confiuration option.
	$( "#control_panel" ).slideUp().css( 'opacity', 0.3 );
	$( "#show_control_panel" ).animate( { opacity: opacity }, duration );
    }

    function build_control_panel() {
	$( "#control_panel" ).css( { opacity: 0.5, display: 'none' } );
	$( "#show_control_panel" ).css( { opacity: 0.3 } );

	// Because event handling is mixed up between tags and
	// sources, and because our mater bestiary of tags is present
	// in the State.sources data structure, we initialize both
	// areas at once.
	add_sources_and_tags_to_control();

    }
    
    function full_screen( enter ) {
	if ( enter ) {
	    var full_screen_on = (document.fullScreenElement && document.fullScreenElement !== null) 
		|| (document.mozFullScreen || document.webkitIsFullScreen);
	    
	    var docElm = document.documentElement;
	    if ( !full_screen_on ) {
		if ( docElm.requestFullscreen ) {
		    docElm.requestFullscreen();
		} else if ( docElm.mozRequestFullScreen ) {
		    docElm.mozRequestFullScreen();
		} else if ( docElm.webkitRequestFullScreen ) {
		    docElm.webkitRequestFullScreen();
		}
	    }
	} else {
	    // DEBUG: Add exit full screen here.
	}
    }
    
    
    // Return the smallest image that is bigger than our browser window.
    function get_best_size( image ) {
	// Treat the window as a bit smaller than it is so as not to
	// cause scrollbars to appear.
	var wpad = 60;
	var hpad = 60;
	
	var sizes = image['sizes'];
	var num_sizes = sizes.length;
	
	// By default we just return the biggest image we have.
	var ret = sizes[num_sizes-1];
	
	// Search for the smallest image which is bigger than our
	// display area.
	for ( var i = 0 ; i < num_sizes ; i++ ) {
	    var img_w = sizes[i]['width'];
	    var img_h = sizes[i]['height'];
	    if ( (img_w >= ($( window ).width() - wpad)) 
		 && (img_h >= $(window).height() - hpad) ) {
		ret = sizes[i];
		break;
	    }
	}

	// Determine the appropriate height and width of the image.
	
	// DEBUG we can probably just scale one of the dimesions and
	// let the browser take care of the rest, or use CSS and set
	// img { max-width: 100%, height: auto; }
	var height_ratio = ret['height'] / ($(window).height() - hpad);
	var width_ratio = ret['width'] / ($(window).width() - wpad);
	if ( height_ratio > 1 || width_ratio > 1 ) {
	    ret['img_height'] = Math.floor( ret['height'] / Math.max( height_ratio, width_ratio ) );
	    ret['img_width'] = Math.floor( ret['width'] / Math.max( height_ratio, width_ratio ) );
	} else {
	    ret['img_height'] = ret['height'];
	    ret['img_width'] = ret['width'];
	}
	return ret;
    }
    
    function get_next_image() {
	// Gets the next image we are to show based on the value of
	// our state object.

	// The tags which are currently operative: State.tags

	// Define the function with this syntax to avoid language
	// specification restrictions on defining functions multiple
	// levels deep.
	var get_next_index = function( candidate ) {
	    if ( candidate === (State.images.length - 1) ) {
		return 0;
	    } else {
		return candidate + 1;
	    }
	}
	
	var candidate_index = State.current_image;
	var infinite_loop_detected = candidate_index;
	var found = false;
	do {
	    candidate_index = get_next_index( candidate_index );
	    var candidate_image = State.images[candidate_index];

	    if ( sources_are_compatible( candidate_image ) 
		 && tags_are_compatible( candidate_image ) ) {
		found = true;
		break;
	    }
	} while ( !found && (candidate_index != infinite_loop_detected) );
	
	if ( !found ) {
	    $( "#no_images_selected" ).css( 'display', 'block' );
	} else {
	    $( "#no_images_selected" ).css( 'display', 'none' );	    
	}

	return candidate_index;
    }

    function sources_are_compatible( image ) {
	for ( var active_source in State.active_sources ) {
	    if ( State.active_sources.hasOwnProperty( active_source ) ) {
		if ( image.sources.hasOwnProperty( active_source ) ) {
		    return true;
		}
	    }
	}
	return false;
    }

    function has_excluded_tag( image ) {
	for ( var tag in image.tags ) {
	    if ( !image.tags.hasOwnProperty( tag ) ) continue;

	    if ( $( '#' + State.tags[tag].tag_id_prefix + '_exclude' )
		 .is( ':checked' ) ) {
		return true;
	    }
	}
	return false;
    }

    function tags_are_compatible( image ) {
	if ( Object.keys( image.tags ).length === 0 ) {
	    return State.show_untagged;
	} else if ( has_excluded_tag( image ) ) {
	    return false;
	} else {
	    var all_so_far = false;

	    for ( var tag in State.tags ) {
		if ( ! State.tags.hasOwnProperty( tag ) ) continue;

		var tag_props = State.tags[tag];
		if ( !tag_props.visible ) continue;
		if ( tag_props.setting !== 'include' ) continue;

		if ( image.tags.hasOwnProperty( tag ) ) {
		    all_so_far = true;
		    if ( State.any_or_all === 'any' ) return true;
		    
		} else if ( State.any_or_all === 'all' ) {
		    return false;
		}
	    }
	    return all_so_far;
	}
    }

    function gallery_show() {
	// Display the image
	State.current_image = State.next_image;
	var img = get_best_size( State.images[State.current_image] );
	
	$( "#slide_show" )
	    .attr( 'src', img['url'] )
	    .width( img['img_width'] )
	    .height( img['img_height'] );
	
	clearTimeout( State.timer );
	State.timer = setTimeout( gallery_show , State.slide_duration );
	
	// Preload the next image.
	State.next_image = get_next_image();
	if ( State.next_image >= State.images.length ) {
	    // Just start over at the beginning of the show if we're
	    // out of images.
	    State.next_image = 0;
	}
	img = get_best_size( State.images[State.next_image] );
	// DEBUG - Determine if setting width and height like this is
	// icky, refactor if necessary.
	$( "<img/>" )
	    .attr( 'src', img['url'] )
	    .width( img['img_width'] )
	    .height( img['img_height'] );
    }
}

$( document ).ready( gallery_player );
